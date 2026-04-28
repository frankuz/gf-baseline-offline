// Main application controller

import { utils } from './utils.js';
import { state } from './state.js';
import { db } from './db.js';
import { csv } from './csv.js';
import { share } from './share.js';
import { survey } from './survey.js';

// Make modules globally available for Alpine.js
window.utils = utils;
window.state = state;
window.db = db;
window.csv = csv;
window.share = share;
window.survey = survey;

// Main Alpine.js application
window.surveyApp = {
    // Reactive properties
    view: 'loading',
    surveyData: null,
    formData: new FormData(),
    responses: [],
    error: null,
    successMessage: null,
    hasDraft: false,
    responseCount: 0,
    showModal: false,
    modalTitle: '',
    modalMessage: '',
    modalType: '',
    deleteConfirmation: '',

    // Initialize application
    async init() {
        try {
            // Initialize database
            await db.init();
            
            // Initialize state
            await state.init();
            
            // Sync reactive properties with state
            this.syncWithState();
            
            // Set up PWA features
            this.setupPWA();
            
            // Handle shared data from URL
            await this.handleSharedData();
            
        } catch (error) {
            console.error('App initialization error:', error);
            this.error = 'Failed to initialize application';
            this.view = 'home';
        }
    },

    // Sync reactive properties with state
    syncWithState() {
        // Watch for state changes and update reactive properties
        const updateProperties = () => {
            this.view = state.view;
            this.surveyData = state.surveyData;
            this.formData = state.formData;
            this.responses = state.responses;
            this.error = state.error;
            this.successMessage = state.successMessage;
            this.hasDraft = state.hasDraft;
            this.responseCount = state.responseCount;
            this.showModal = state.showModal;
            this.modalTitle = state.modalTitle;
            this.modalMessage = state.modalMessage;
            this.modalType = state.modalType;
            // Only update deleteConfirmation if state has a non-empty value (preserves user input)
            if (state.deleteConfirmation !== '') {
                this.deleteConfirmation = state.deleteConfirmation;
            }
        };

        // Initial sync
        updateProperties();

        // Watch for state changes (simple polling for now)
        setInterval(updateProperties, 100);

        // Render survey when entering survey view
        this.$watch('view', (newView) => {
            if (newView === 'survey' && this.surveyData) {
                this.$nextTick(() => {
                    survey.renderForm(this.surveyData.questions, this.formData);
                });
            }
        });

        // Update responses list when in data view
        this.$watch('view', (newView) => {
            if (newView === 'data') {
                this.$nextTick(() => {
                    this.renderResponsesList();
                });
            }
        });
    },

    // Navigation methods
    showHome() {
        state.showHome();
    },

    showData() {
        state.showData();
    },

    startSurvey() {
        state.startSurvey();
    },

    resumeSurvey() {
        state.resumeSurvey();
    },

    submitSurvey() {
        const errors = survey.validateForm(this.formData, this.surveyData.questions);
        if (errors.length > 0) {
            this.error = errors[0];
            survey.scrollToFirstError(errors, this.surveyData.questions);
            return;
        }

        state.submitSurvey();
    },

    discardSurvey() {
        state.discardSurvey();
    },

    exportData() {
        state.exportData();
    },

    shareData() {
        state.shareData();
    },

    confirmDeleteData() {
        state.confirmDeleteData();
    },

    // Modal methods
    closeModal() {
        state.closeModal();
    },

    confirmModal() {
        state.confirmModal();
    },

    // Render responses list
    renderResponsesList() {
        const container = document.getElementById('responsesList');
        if (!container) {
            return;
        }

        container.innerHTML = '';

        if (this.responses.length === 0) {
            container.innerHTML = '<p class="no-responses">No responses stored yet.</p>';
            return;
        }

        for (const response of this.responses) {
            const responseDiv = document.createElement('div');
            responseDiv.className = 'response-item';

            const infoDiv = document.createElement('div');
            infoDiv.className = 'response-info';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'response-name';
            nameDiv.textContent = utils.getResponseDisplayName(response, this.surveyData.questions);

            const dateDiv = document.createElement('div');
            dateDiv.className = 'response-date';
            dateDiv.textContent = utils.formatDate(response.timestamp);

            infoDiv.appendChild(nameDiv);
            infoDiv.appendChild(dateDiv);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'response-actions';

            const shareBtn = document.createElement('button');
            shareBtn.className = 'btn btn-secondary btn-small';
            shareBtn.textContent = 'Share';
            shareBtn.onclick = () => this.shareResponse(response);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-small';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => this.deleteResponse(response.id);

            actionsDiv.appendChild(shareBtn);
            actionsDiv.appendChild(deleteBtn);

            responseDiv.appendChild(infoDiv);
            responseDiv.appendChild(actionsDiv);
            container.appendChild(responseDiv);
        }
    },

    // Share individual response
    async shareResponse(response) {
        try {
            await share.shareResponse(response, this.surveyData.questions);
        } catch (error) {
            console.error('Share response error:', error);
            this.error = 'Failed to share response';
        }
    },

    // Delete individual response
    async deleteResponse(responseId) {
        try {
            await db.deleteResponse(responseId);
            await state.loadResponseCount();
            this.renderResponsesList();
            utils.showSuccess('Response deleted successfully!');
        } catch (error) {
            console.error('Delete response error:', error);
            this.error = 'Failed to delete response';
        }
    },

    // Setup PWA features
    setupPWA() {
        // Register service worker
        if (utils.isServiceWorkerSupported()) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }

        // Setup install prompt
        this.setupInstallPrompt();
    },

    // Setup install prompt for PWA
    setupInstallPrompt() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;

            // Show install banner
            this.showInstallBanner();
        });

        window.addEventListener('appinstalled', () => {
            utils.showSuccess('App installed successfully!');
        });

        // Handle install button click
        this.installApp = () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    } else {
                        console.log('User dismissed the install prompt');
                    }
                    deferredPrompt = null;
                });
            }
        };
    },

    // Show install banner
    showInstallBanner() {
        // Only show if not already installed and not in standalone mode
        if (utils.isStandaloneMode()) {
            return;
        }

        const banner = document.createElement('div');
        banner.className = 'install-prompt';
        banner.innerHTML = `
            <div class="install-prompt-text">Install this app for offline use</div>
            <div class="install-prompt-buttons">
                <button class="btn btn-secondary" onclick="this.closest('.install-prompt').remove()">Dismiss</button>
                <button class="btn btn-primary" onclick="surveyApp.installApp(); this.closest('.install-prompt').remove()">Install</button>
            </div>
        `;

        document.body.appendChild(banner);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (banner.parentNode) {
                banner.remove();
            }
        }, 10000);
    },

    // Handle shared data from URL
    async handleSharedData() {
        try {
            await share.handleSharedFromURL();
        } catch (error) {
            console.error('Handle shared data error:', error);
        }
    },

    // Handle online/offline status
    setupNetworkStatus() {
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                utils.showSuccess('Connection restored');
            } else {
                utils.showError('Connection lost - working offline');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
    },

    // Handle visibility change (app switching)
    setupVisibilityChange() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // App became visible again
                state.loadResponseCount();
            }
        });
    },

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save draft
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (this.view === 'survey') {
                    state.saveDraft();
                    utils.showSuccess('Draft saved');
                }
            }

            // Escape to close modal
            if (e.key === 'Escape' && this.showModal) {
                this.closeModal();
            }

            // Ctrl/Cmd + E to export
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                if (this.view === 'data') {
                    this.exportData();
                }
            }
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Setup additional features
    window.surveyApp.setupNetworkStatus();
    window.surveyApp.setupVisibilityChange();
    window.surveyApp.setupKeyboardShortcuts();
});

// Make app available globally
window.app = window.surveyApp;
