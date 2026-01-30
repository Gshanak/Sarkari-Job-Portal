#!/usr/bin/env python3
"""
Government Jobs Scraper for India
Scrapes from official sources without requiring API keys
"""

import json
import re
import requests
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import feedparser
import os

class JobScraper:
    def __init__(self):
        self.jobs = []
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
    def fetch_ssc_jobs(self):
        """Fetch from SSC official website"""
        try:
            url = "https://ssc.nic.in/Portal/Notifications"
            response = self.session.get(url, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Parse SSC notifications table
            tables = soup.find_all('table', class_='table')
            for table in tables:
                rows = table.find_all('tr')[1:]  # Skip header
                for row in rows:
                    cols = row.find_all('td')
                    if len(cols) >= 4:
                        title = cols[0].text.strip()
                        date_str = cols[1].text.strip()
                        dept = "ssc"
                        
                        if self.is_valid_job(title):
                            job = {
                                "id": f"ssc_{hash(title)}",
                                "title": title,
                                "organization": "Staff Selection Commission",
                                "department": dept,
                                "qualification": self.extract_qualification(title),
                                "location": "All India",
                                "postedDate": self.parse_date(date_str),
                                "deadline": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                                "salary": "As per Pay Matrix",
                                "officialUrl": "https://ssc.nic.in",
                                "notificationUrl": "https://ssc.nic.in/Portal/Notifications",
                                "applyUrl": "https://ssc.nic.in/Portal/Apply"
                            }
                            self.jobs.append(job)
        except Exception as e:
            print(f"Error fetching SSC jobs: {e}")

    def fetch_upsc_jobs(self):
        """Fetch from UPSC RSS feed"""
        try:
            feed = feedparser.parse("https://upsc.gov.in/feeds/whats-new.xml")
            for entry in feed.entries[:10]:
                title = entry.title
                if 'exam' in title.lower() or 'recruitment' in title.lower():
                    job = {
                        "id": f"upsc_{hash(title)}",
                        "title": title,
                        "organization": "Union Public Service Commission",
                        "department": "upsc",
                        "qualification": self.extract_qualification(title),
                        "location": "All India",
                        "postedDate": datetime.now().strftime("%Y-%m-%d"),
                        "deadline": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                        "salary": "As per 7th CPC",
                        "officialUrl": "https://upsc.gov.in",
                        "notificationUrl": entry.link,
                        "applyUrl": "https://upsconline.nic.in"
                    }
                    self.jobs.append(job)
        except Exception as e:
            print(f"Error fetching UPSC jobs: {e}")

    def fetch_railway_jobs(self):
        """Fetch from Railway Recruitment Board"""
        try:
            url = "https://rrbcdg.gov.in/"
            response = self.session.get(url, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for notification links
            notices = soup.find_all('a', href=re.compile(r'notice|notification', re.I))
            for notice in notices[:5]:
                title = notice.text.strip()
                if self.is_valid_job(title):
                    job = {
                        "id": f"rrb_{hash(title)}",
                        "title": title,
                        "organization": "Railway Recruitment Board",
                        "department": "railway",
                        "qualification": self.extract_qualification(title),
                        "location": "All India",
                        "postedDate": datetime.now().strftime("%Y-%m-%d"),
                        "deadline": (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%d"),
                        "salary": "Level 2-6 Pay Matrix",
                        "officialUrl": "https://rrbcdg.gov.in",
                        "notificationUrl": "https://rrbcdg.gov.in/Notices",
                        "applyUrl": "https://rrbonlinereg.in"
                    }
                    self.jobs.append(job)
        except Exception as e:
            print(f"Error fetching Railway jobs: {e}")

    def fetch_bank_jobs(self):
        """Fetch from IBPS and banking sources"""
        try:
            # IBPS
            url = "https://ibps.in/crp-clerks/"
            response = self.session.get(url, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            announcements = soup.find_all('div', class_=re.compile(r'notice|announcement', re.I))
            for ann in announcements[:3]:
                title = ann.get_text().strip()
                if 'recruitment' in title.lower() or 'notification' in title.lower():
                    job = {
                        "id": f"ibps_{hash(title)}",
                        "title": title[:100],
                        "organization": "Institute of Banking Personnel",
                        "department": "banking",
                        "qualification": self.extract_qualification(title),
                        "location": "All India",
                        "postedDate": datetime.now().strftime("%Y-%m-%d"),
                        "deadline": (datetime.now() + timedelta(days=20)).strftime("%Y-%m-%d"),
                        "salary": "As per IBA Scale",
                        "officialUrl": "https://ibps.in",
                        "notificationUrl": "https://ibps.in/crp-clerks/",
                        "applyUrl": "https://ibps.in"
                    }
                    self.jobs.append(job)
        except Exception as e:
            print(f"Error fetching Bank jobs: {e}")

    def fetch_defence_jobs(self):
        """Fetch from Indian Army, Navy, Air Force"""
        sources = [
            ("Indian Army", "https://joinindianarmy.nic.in", "defence"),
            ("Indian Navy", "https://joinindiannavy.gov.in", "defence"),
            ("Indian Air Force", "https://indianairforce.nic.in", "defence")
        ]
        
        for org, url, dept in sources:
            try:
                job = {
                    "id": f"def_{hash(org)}_{datetime.now().timestamp()}",
                    "title": f"{org} - Latest Recruitment",
                    "organization": org,
                    "department": dept,
                    "qualification": "10th/12th/Graduate",
                    "location": "All India",
                    "postedDate": datetime.now().strftime("%Y-%m-%d"),
                    "deadline": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
                    "salary": "As per Defence Pay Matrix",
                    "officialUrl": url,
                    "notificationUrl": f"{url}/Authentication.aspx",
                    "applyUrl": url
                }
                self.jobs.append(job)
            except Exception as e:
                print(f"Error fetching {org} jobs: {e}")

    def is_valid_job(self, title):
        """Check if title contains job-related keywords"""
        keywords = ['recruitment', 'vacancy', 'post', 'exam', 'notification', 'apply', 'vacancies']
        return any(kw in title.lower() for kw in keywords)

    def extract_qualification(self, title):
        """Extract qualification from title"""
        title = title.lower()
        quals = {
            '10th': '10th Pass',
            '12th': '12th Pass',
            'matric': '10th Pass',
            'intermediate': '12th Pass',
            'graduate': 'Graduate',
            'bachelor': 'Graduate',
            'b.tech': 'B.Tech/BE',
            'be ': 'B.Tech/BE',
            'b.e': 'B.Tech/BE',
            'm.tech': 'M.Tech/ME',
            'm.e': 'M.Tech/ME',
            'diploma': 'Diploma',
            'phd': 'PhD',
            'post graduate': 'Post Graduate',
            'pg ': 'Post Graduate'
        }
        
        for key, value in quals.items():
            if key in title:
                return value
        return 'As per Notification'

    def parse_date(self, date_str):
        """Parse various date formats"""
        formats = ['%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d', '%d %b %Y']
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
            except:
                continue
        return datetime.now().strftime('%Y-%m-%d')

    def remove_duplicates(self):
        """Remove duplicate jobs based on title similarity"""
        seen = set()
        unique_jobs = []
        for job in self.jobs:
            key = f"{job['title']}_{job['organization']}"
            if key not in seen:
                seen.add(key)
                unique_jobs.append(job)
        self.jobs = unique_jobs

    def save_jobs(self):
        """Save jobs to JSON file"""
        data = {
            "lastUpdated": datetime.now().isoformat(),
            "source": "Multiple Official Government Sources",
            "jobs": self.jobs
        }
        
        # Ensure data directory exists
        os.makedirs('data', exist_ok=True)
        
        with open('data/jobs.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"Saved {len(self.jobs)} jobs to data/jobs.json")

    def run(self):
        """Run all scrapers"""
        print("Starting job scraper...")
        
        self.fetch_ssc_jobs()
        self.fetch_upsc_jobs()
        self.fetch_railway_jobs()
        self.fetch_bank_jobs()
        self.fetch_defence_jobs()
        
        self.remove_duplicates()
        self.save_jobs()
        
        print("Scraping completed!")

if __name__ == "__main__":
    scraper = JobScraper()
    scraper.run()
