// Job Portal with Capacitor Native Features
class JobPortal {
    constructor() {
        this.jobs = [];
        this.filteredJobs = [];
        this.sources = [];
        this.savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
        this.currentDate = new Date();
        this.isNative = false;
        this.init();
    }

    async init() {
        // Check if running in Capacitor
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            this.isNative = true;
            await this.initNativeFeatures();
        }

        this.bindEvents();
        await this.loadSources();
        await this.loadJobs();
        this.updateStats();
        this.renderJobs();
        this.renderSources();
        this.initPullToRefresh();
    }

    async initNativeFeatures() {
        // Status bar styling
        const { StatusBar } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: 'Dark' });
        await StatusBar.setBackgroundColor({ color: '#0a0a0a' });

        // Share functionality
        const { Share } = await import('@capacitor/share');
        this.sharePlugin = Share;
    }

    bindEvents() {
        // Search
        document.getElementById('searchBtn').addEventListener('click', () => this.filterJobs());
        ['qualification', 'department', 'location', 'sortBy'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.filterJobs());
        });

        // Quick filters
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                this.applyQuickFilter(e.target.dataset.filter);
            });
        });

        // Modal controls
        document.getElementById('suggestSourceBtn').addEventListener('click', () => this.openModal());
        document.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        document.querySelector('.modal-overlay').addEventListener('click', () => this.closeModal());

        // Form submission
        document.getElementById('suggestForm').addEventListener('submit', (e) => this.handleSuggestion(e));

        // Share button
        document.getElementById('shareBtn')?.addEventListener('click', () => this.shareApp());

        // Bottom nav
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleNav(e));
        });

        // Department change updates state dropdown
        document.getElementById('sourceDept')?.addEventListener('change', (e) => {
            const stateSelect = document.getElementById('sourceState');
            stateSelect.style.display = e.target.value === 'state' ? 'block' : 'none';
        });
    }

    initPullToRefresh() {
        let startY = 0;
        const pullRefresh = document.getElementById('pullRefresh');
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (window.scrollY === 0 && e.touches[0].pageY > startY + 100) {
                pullRefresh.classList.add('visible');
            }
        });

        document.addEventListener('touchend', async () => {
            if (pullRefresh.classList.contains('visible')) {
                await this.loadJobs();
                pullRefresh.classList.remove('visible');
                this.showToast('Refreshed successfully!');
            }
        });
    }

    async loadSources() {
        try {
            const response = await fetch('data/sources.json');
            const data = await response.json();
            this.sources = data.sources || [];
            document.getElementById('totalSources').textContent = this.sources.length;
        } catch (error) {
            console.error('Error loading sources:', error);
        }
    }

    async loadJobs() {
        try {
            const response = await fetch('data/jobs.json');
            const data = await response.json();
            this.jobs = data.jobs || [];
            
            // Filter active jobs only
            this.jobs = this.jobs.filter(job => {
                const deadline = new Date(job.deadline);
                return deadline >= this.currentDate;
            });

            this.jobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
            this.filteredJobs = [...this.jobs];

            if (data.lastUpdated) {
                document.getElementById('lastUpdated').textContent = this.formatTimeAgo(data.lastUpdated);
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
            this.showToast('Failed to load jobs');
        }
    }

    renderSources() {
        const container = document.getElementById('sourcesContainer');
        const activeSources = this.sources.filter(s => s.status === 'active');
        
        document.getElementById('sourceCount').textContent = `${activeSources.length} Active`;
        
        container.innerHTML = activeSources.slice(0, 5).map(source => `
            <div class="source-item">
                <div class="source-info">
                    <h4>${source.name}</h4>
                    <span>${source.department} • ${source.state || 'All India'}</span>
                </div>
                <div class="source-status"></div>
            </div>
        `).join('');
    }

    filterJobs() {
        const qualification = document.getElementById('qualification').value;
        const department = document.getElementById('department').value;
        const location = document.getElementById('location').value;
        const sortBy = document.getElementById('sortBy').value;

        this.filteredJobs = this.jobs.filter(job => {
            const matchQual = qualification === 'all' || 
                job.qualification.toLowerCase().includes(qualification.toLowerCase());
            const matchDept = department === 'all' || 
                job.department.toLowerCase() === department.toLowerCase();
            const matchLoc = location === 'all' || 
                job.location.toLowerCase().includes(location.toLowerCase());
            return matchQual && matchDept && matchLoc;
        });

        this.sortJobs(sortBy);
        this.renderJobs();
    }

    applyQuickFilter(filter) {
        switch(filter) {
            case 'today':
                const today = new Date().toISOString().split('T')[0];
                this.filteredJobs = this.jobs.filter(job => job.postedDate === today);
                break;
            case 'week':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                this.filteredJobs = this.jobs.filter(job => new Date(job.postedDate) >= weekAgo);
                break;
            case '10th':
                this.filteredJobs = this.jobs.filter(job => 
                    job.qualification.toLowerCase().includes('10th'));
                break;
            case 'graduate':
                this.filteredJobs = this.jobs.filter(job => 
                    job.qualification.toLowerCase().includes('graduate'));
                break;
        }
        this.renderJobs();
    }

    sortJobs(sortBy) {
        switch(sortBy) {
            case 'newest':
                this.filteredJobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
                break;
            case 'deadline':
                this.filteredJobs.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
                break;
        }
    }

    renderJobs() {
        const container = document.getElementById('jobsContainer');
        
        if (this.filteredJobs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>No jobs found</h3>
                    <p>Try adjusting filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredJobs.map(job => this.createJobCard(job)).join('');
    }

    createJobCard(job) {
        const isUrgent = this.getDaysLeft(job.deadline) <= 3;
        const isSaved = this.savedJobs.includes(job.id);
        
        return `
            <article class="job-card" data-id="${job.id}">
                <div class="job-header">
                    <div>
                        <h4 class="job-title">${job.title}</h4>
                        <span class="job-org">${job.organization}</span>
                    </div>
                    <span class="job-badge ${isUrgent ? 'urgent' : ''}">
                        ${isUrgent ? '🔥 Urgent' : 'Active'}
                    </span>
                </div>
                
                <div class="job-details">
                    <span class="detail-item">🎓 ${job.qualification}</span>
                    <span class="detail-item">📍 ${job.location}</span>
                    <span class="detail-item">⏰ ${this.getDaysLeft(job.deadline)} days left</span>
                </div>
                
                <div class="job-actions">
                    <button class="action-btn save-btn" onclick="app.toggleSave('${job.id}')">
                        ${isSaved ? '🔖' : '🔖'}
                    </button>
                    <a href="${job.notificationUrl}" target="_blank" class="action-btn">
                        📄 Notice
                    </a>
                    <a href="${job.applyUrl}" target="_blank" class="action-btn apply">
                        Apply
                    </a>
                </div>
            </article>
        `;
    }

    toggleSave(jobId) {
        const index = this.savedJobs.indexOf(jobId);
        if (index > -1) {
            this.savedJobs.splice(index, 1);
            this.showToast('Removed from saved');
        } else {
            this.savedJobs.push(jobId);
            this.showToast('Job saved!');
        }
        localStorage.setItem('savedJobs', JSON.stringify(this.savedJobs));
        this.renderJobs();
    }

    async handleSuggestion(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('sourceName').value,
            url: document.getElementById('sourceUrl').value,
            department: document.getElementById('sourceDept').value,
            state: document.getElementById('sourceState').value,
            email: document.getElementById('userEmail').value,
            submittedAt: new Date().toISOString()
        };

        // Validate URL
        if (!this.isValidGovtUrl(formData.url)) {
            this.showToast('⚠️ Please provide a valid .gov.in or official URL');
            return;
        }

        try {
            // Method 1: GitHub Issues API (Free)
            await this.submitToGitHub(formData);
            
            // Method 2: Local storage backup
            this.saveSuggestionLocally(formData);
            
            this.showToast('✅ Suggestion submitted for review!');
            this.closeModal();
            document.getElementById('suggestForm').reset();
            
        } catch (error) {
            console.error('Submission error:', error);
            this.showToast('❌ Failed to submit. Try email option.');
        }
    }

    isValidGovtUrl(url) {
        const validPatterns = [
            /\.gov\.in$/i,
            /\.nic\.in$/i,
            /\.ac\.in$/i,
            /government/i,
            /official/i
        ];
        return validPatterns.some(pattern => pattern.test(url));
    }

    async submitToGitHub(data) {
        // Create GitHub issue using their API
        // You'll need to set up a GitHub token as a secret
        const issueBody = `
## New Source Suggestion

**Name:** ${data.name}
**URL:** ${data.url}
**Department:** ${data.department}
**State:** ${data.state || 'N/A'}
**Submitted by:** ${data.email || 'Anonymous'}
**Date:** ${data.submittedAt}

### Verification Checklist
- [ ] URL is accessible
- [ ] Contains job notifications
- [ ] Official government site
- [ ] Added to scraper
`;

        // For now, open GitHub issue page
        const issueUrl = `https://github.com/YOUR_USERNAME/sarkari-jobs-portal/issues/new?title=Suggest+Source:+${encodeURIComponent(data.name)}&body=${encodeURIComponent(issueBody)}`;
        
        if (this.isNative) {
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url: issueUrl });
        } else {
            window.open(issueUrl, '_blank');
        }
    }

    saveSuggestionLocally(data) {
        const suggestions = JSON.parse(localStorage.getItem('suggestions') || '[]');
        suggestions.push(data);
        localStorage.setItem('suggestions', JSON.stringify(suggestions));
    }

    async shareApp() {
        const shareData = {
            title: 'Sarkari Naukri - Govt Jobs',
            text: 'Find latest government job notifications! Download now:',
            url: 'https://github.com/YOUR_USERNAME/sarkari-jobs-portal/releases'
        };

        if (this.isNative && this.sharePlugin) {
            await this.sharePlugin.share(shareData);
        } else if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback - copy to clipboard
            await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
            this.showToast('Link copied to clipboard!');
        }
    }

    openModal() {
        document.getElementById('suggestModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        document.getElementById('suggestModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    handleNav(e) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        const page = e.currentTarget.dataset.page;
        if (page === 'saved') {
            this.filteredJobs = this.jobs.filter(job => this.savedJobs.includes(job.id));
            this.renderJobs();
        } else if (page === 'home') {
            this.filterJobs();
        }
    }

    updateStats() {
        document.getElementById('totalJobs').textContent = this.jobs.length;
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('todayJobs').textContent = 
            this.jobs.filter(job => job.postedDate === today).length;
    }

    getDaysLeft(deadline) {
        const end = new Date(deadline);
        const now = new Date();
        return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    }

    formatTimeAgo(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / (1000 * 60));
        
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return `${Math.floor(diff / 1440)}d ago`;
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

// Initialize
const app = new JobPortal();
