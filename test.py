from bs4 import BeautifulSoup 
import cloudscraper 
 
url = "https://cryptorank.io/price/uniswap/vesting" 
proxy = {
    'http': 'http://98.70.2.182:443',
    'https': 'https://98.70.2.182:443'
}
scraper = cloudscraper.create_scraper() 
info = scraper.get(url, proxies=proxy) 
 
print(info.status_code) 
print(info.content)
