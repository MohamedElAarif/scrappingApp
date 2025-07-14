import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync } from 'child_process';
import { 
  ScrapingConfiguration, 
  ScrapingSelector, 
  ScrapedData, 
  ScrapingProgress 
} from '@shared/schema';
import { storage } from '../storage';

export class ScrapingService {
  private browser: Browser | null = null;
  private activeSessions: Map<number, boolean> = new Map();

  async initBrowser(): Promise<void> {
    if (!this.browser) {
      let executablePath: string | undefined;
      
      // Try to find Chrome/Chromium executable
      try {
        executablePath = execSync('which chromium', { encoding: 'utf8' }).trim();
      } catch {
        try {
          executablePath = execSync('which chrome', { encoding: 'utf8' }).trim();
        } catch {
          try {
            executablePath = execSync('which google-chrome', { encoding: 'utf8' }).trim();
          } catch {
            // Let Puppeteer handle the default path
            executablePath = undefined;
          }
        }
      }

      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ],
        executablePath
      });
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async startScraping(configId: number, sessionId: number): Promise<void> {
    try {
      const config = await storage.getConfiguration(configId);
      if (!config) {
        throw new Error('Configuration not found');
      }

      this.activeSessions.set(sessionId, true);
      await storage.updateSessionStatus(sessionId, 'running');

      await this.initBrowser();
      const page = await this.browser!.newPage();

      // Set user agent
      const userAgents = {
        'Chrome (Desktop)': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Firefox (Desktop)': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Safari (Desktop)': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Mobile Chrome': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
      };

      await page.setUserAgent(userAgents[config.userAgent as keyof typeof userAgents] || userAgents['Chrome (Desktop)']);

      const allResults: ScrapedData[] = [];
      let currentPage = 1;
      let hasNextPage = true;
      let currentUrl = config.targetUrl;

      while (hasNextPage && this.activeSessions.get(sessionId)) {
        try {
          await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 30000 });

          // Wait for dynamic content if enabled
          if (config.options?.waitForDynamic) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // Add request delay
          if (config.requestDelay && config.requestDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, config.requestDelay));
          }

          // Extract data using selectors
          const pageResults = await this.extractDataFromPage(page, config.selectors);
          
          // Apply filters
          const filteredResults = this.applyFilters(pageResults, config.filters);
          allResults.push(...filteredResults);

          // Update progress
          const progress: ScrapingProgress = {
            current: currentPage,
            total: config.pagination?.maxPages || 1,
            extracted: allResults.length,
            errors: 0
          };

          await storage.updateSessionProgress(sessionId, progress);
          await storage.updateSessionResults(sessionId, allResults);

          // Handle pagination
          if (config.options?.handlePagination && config.pagination?.nextSelector) {
            const maxPages = config.pagination.maxPages || 10;
            if (currentPage >= maxPages) {
              hasNextPage = false;
            } else {
              const nextButton = await page.$(config.pagination.nextSelector);
              if (nextButton) {
                const isDisabled = await page.evaluate(el => {
                  return el.disabled || el.classList.contains('disabled') || 
                         el.getAttribute('aria-disabled') === 'true';
                }, nextButton);

                if (!isDisabled) {
                  await nextButton.click();
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  currentPage++;
                  currentUrl = page.url();
                } else {
                  hasNextPage = false;
                }
              } else {
                hasNextPage = false;
              }
            }
          } else {
            hasNextPage = false;
          }

        } catch (error) {
          await storage.addSessionError(sessionId, `Page ${currentPage}: ${error.message}`);
          hasNextPage = false;
        }
      }

      await page.close();

      // Remove duplicates if enabled
      const finalResults = config.options?.removeDuplicates ? 
        this.removeDuplicates(allResults) : allResults;

      await storage.updateSessionResults(sessionId, finalResults);
      await storage.updateSessionStatus(sessionId, 'completed', new Date());

    } catch (error) {
      await storage.addSessionError(sessionId, error.message);
      await storage.updateSessionStatus(sessionId, 'failed', new Date());
    } finally {
      this.activeSessions.delete(sessionId);
    }
  }

  async stopScraping(sessionId: number): Promise<void> {
    this.activeSessions.set(sessionId, false);
    await storage.updateSessionStatus(sessionId, 'stopped', new Date());
  }

  private async extractDataFromPage(page: Page, selectors: ScrapingSelector[]): Promise<ScrapedData[]> {
    return await page.evaluate((selectors) => {
      const results: ScrapedData[] = [];
      
      // Determine if we're extracting multiple items or single values
      const firstSelector = selectors[0];
      if (!firstSelector) return results;

      // Try to find multiple elements first
      const firstElements = firstSelector.cssSelector ? 
        document.querySelectorAll(firstSelector.cssSelector) : [];

      if (firstElements.length > 1) {
        // Multiple items detected - extract data for each item
        firstElements.forEach((_, index) => {
          const item: ScrapedData = {};
          let hasData = false;

          selectors.forEach(selector => {
            try {
              let element: Element | null = null;

              if (selector.cssSelector) {
                const elements = document.querySelectorAll(selector.cssSelector);
                element = elements[index] || null;
              } else if (selector.xpath) {
                const result = document.evaluate(
                  selector.xpath,
                  document,
                  null,
                  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                  null
                );
                element = result.snapshotItem(index);
              }

              if (element) {
                let value: string | null = null;
                
                switch (selector.attribute) {
                  case 'textContent':
                    value = element.textContent?.trim() || null;
                    break;
                  case 'innerHTML':
                    value = element.innerHTML?.trim() || null;
                    break;
                  default:
                    value = element.getAttribute(selector.attribute) || null;
                }

                if (value) {
                  item[selector.name] = value;
                  hasData = true;
                } else if (selector.required) {
                  return; // Skip this item if required field is missing
                }
              } else if (selector.required) {
                return; // Skip this item if required element not found
              }
            } catch (error) {
              console.error(`Error extracting ${selector.name}:`, error);
              if (selector.required) {
                return; // Skip this item if required field fails
              }
            }
          });

          if (hasData) {
            results.push(item);
          }
        });
      } else {
        // Single item extraction
        const item: ScrapedData = {};
        let hasData = false;

        selectors.forEach(selector => {
          try {
            let element: Element | null = null;

            if (selector.cssSelector) {
              element = document.querySelector(selector.cssSelector);
            } else if (selector.xpath) {
              const result = document.evaluate(
                selector.xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              );
              element = result.singleNodeValue as Element;
            }

            if (element) {
              let value: string | null = null;
              
              switch (selector.attribute) {
                case 'textContent':
                  value = element.textContent?.trim() || null;
                  break;
                case 'innerHTML':
                  value = element.innerHTML?.trim() || null;
                  break;
                default:
                  value = element.getAttribute(selector.attribute) || null;
              }

              if (value) {
                item[selector.name] = value;
                hasData = true;
              }
            }
          } catch (error) {
            console.error(`Error extracting ${selector.name}:`, error);
          }
        });

        if (hasData) {
          results.push(item);
        }
      }

      return results;
    }, selectors);
  }

  private applyFilters(data: ScrapedData[], filters: any): ScrapedData[] {
    if (!filters) return data;

    return data.filter(item => {
      // Apply include filter
      if (filters.include) {
        const includeRegex = new RegExp(filters.include, 'i');
        const hasMatch = Object.values(item).some(value => 
          value && includeRegex.test(value.toString())
        );
        if (!hasMatch) return false;
      }

      // Apply exclude filter
      if (filters.exclude) {
        const excludeRegex = new RegExp(filters.exclude, 'i');
        const hasMatch = Object.values(item).some(value => 
          value && excludeRegex.test(value.toString())
        );
        if (hasMatch) return false;
      }

      return true;
    });
  }

  private removeDuplicates(data: ScrapedData[]): ScrapedData[] {
    const seen = new Set<string>();
    return data.filter(item => {
      const key = JSON.stringify(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async testSelector(url: string, selector: ScrapingSelector): Promise<{ success: boolean; preview?: string; error?: string }> {
    try {
      await this.initBrowser();
      const page = await this.browser!.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const result = await page.evaluate((sel) => {
        try {
          let element: Element | null = null;
          
          if (sel.cssSelector) {
            element = document.querySelector(sel.cssSelector);
          } else if (sel.xpath) {
            const result = document.evaluate(
              sel.xpath,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            element = result.singleNodeValue as Element;
          }

          if (element) {
            let value: string | null = null;
            
            switch (sel.attribute) {
              case 'textContent':
                value = element.textContent?.trim() || null;
                break;
              case 'innerHTML':
                value = element.innerHTML?.trim() || null;
                break;
              default:
                value = element.getAttribute(sel.attribute) || null;
            }

            return { success: true, preview: value || 'Element found but no content' };
          } else {
            return { success: false, error: 'Element not found' };
          }
        } catch (error) {
          return { success: false, error: error.message };
        }
      }, selector);

      await page.close();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export const scrapingService = new ScrapingService();
