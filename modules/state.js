// Application state management

export const state = {
    // Current view state
    view: 'loading',
    
    // Survey data
    surveyData: null,
    
    // Form data
    formData: new FormData(),
    
    // Responses data
    responses: [],
    
    // UI state
    error: null,
    successMessage: null,
    hasDraft: false,
    responseCount: 0,
    
    // Modal state
    showModal: false,
    modalTitle: '',
    modalMessage: '',
    modalType: '',
    deleteConfirmation: '',
    
    // Initialize state
    async init() {
        try {
            // Check for existing draft
            this.checkDraft();
            
            // Load survey data
            await this.loadSurveyData();
            
            // Load responses count
            await this.loadResponseCount();
            
            // Set initial view
            this.view = 'home';
            
        } catch (error) {
            console.error('State initialization error:', error);
            this.error = 'Failed to initialize application';
            this.view = 'home';
        }
    },
    
    // Load survey configuration
    async loadSurveyData() {
        try {
            const response = await fetch('./config/survey.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.surveyData = await response.json();
            
            if (!this.surveyData || !this.surveyData.questions) {
                throw new Error('Invalid survey configuration');
            }
            
        } catch (error) {
            console.error('Survey loading error:', error);
            this.error = 'Failed to load survey configuration. Please check your connection and try again.';
            throw error;
        }
    },
    
    // Check for existing draft
    checkDraft() {
        const draft = localStorage.getItem('surveyDraft');
        this.hasDraft = !!draft;
        return draft;
    },
    
    // Save draft to localStorage
    saveDraft() {
        if (this.formData && this.view === 'survey') {
            const draftData = {
                timestamp: utils.getTimestamp(),
                data: Object.fromEntries(this.formData.entries())
            };
            localStorage.setItem('surveyDraft', JSON.stringify(draftData));
            this.hasDraft = true;
        }
    },
    
    // Load draft from localStorage
    loadDraft() {
        const draft = localStorage.getItem('surveyDraft');
        if (draft) {
            try {
                const draftData = JSON.parse(draft);
                this.formData = new FormData();
                
                // Restore form data
                for (const [key, value] of Object.entries(draftData.data)) {
                    this.formData.append(key, value);
                }
                
                return true;
            } catch (error) {
                console.error('Draft loading error:', error);
                this.clearDraft();
                return false;
            }
        }
        return false;
    },
    
    // Clear draft from localStorage
    clearDraft() {
        localStorage.removeItem('surveyDraft');
        this.hasDraft = false;
    },
    
    // Load response count from IndexedDB
    async loadResponseCount() {
        try {
            this.responses = await db.getAllResponses();
            this.responseCount = this.responses.length;
        } catch (error) {
            console.error('Response count loading error:', error);
            this.responseCount = 0;
        }
    },
    
    // Navigate to home view
    showHome() {
        this.view = 'home';
        this.loadResponseCount();
    },
    
    // Navigate to survey view
    showSurvey() {
        this.view = 'survey';
        this.error = null;
    },
    
    // Navigate to data view
    showData() {
        this.view = 'data';
        this.loadResponseCount();
    },
    
    // Start new survey
    startSurvey() {
        this.formData = new FormData();
        this.clearDraft();
        this.showSurvey();
    },
    
    // Resume existing survey
    resumeSurvey() {
        if (this.loadDraft()) {
            this.showSurvey();
        }
    },
    
    // Submit survey
    async submitSurvey() {
        try {
            // Validate form
            const errors = utils.validateForm(this.formData, this.surveyData.questions);
            if (errors.length > 0) {
                this.error = errors[0];
                return false;
            }
            
            // Create response object
            const response = this.createResponseObject();
            
            // Save to IndexedDB
            await db.saveResponse(response);
            
            // Clear draft and form
            this.clearDraft();
            this.formData = new FormData();
            
            // Show success and go home
            this.successMessage = 'Survey submitted successfully!';
            utils.showSuccess('Survey submitted successfully!');
            this.showHome();
            
            return true;
            
        } catch (error) {
            console.error('Survey submission error:', error);
            this.error = 'Failed to submit survey. Please try again.';
            return false;
        }
    },
    
    // Create response object from form data
    createResponseObject() {
        const response = {
            id: utils.generateUUID(),
            timestamp: utils.getTimestamp()
        };
        
        // Process each question
        for (const question of this.surveyData.questions) {
            const value = this.formData.get(question.id);
            
            if (question.input_type === 'checkbox') {
                // Handle checkbox values
                const checkboxValues = utils.parseCheckboxValues(this.formData, question.id);
                response[question.id] = utils.joinCheckboxValues(checkboxValues);
            } else if (value) {
                // Handle other input types
                response[question.id] = question.input_type === 'number' ? 
                    parseInt(value, 10) : value;
            }
        }
        
        return response;
    },
    
    // Discard survey with confirmation
    discardSurvey() {
        this.modalTitle = 'Discard Survey';
        this.modalMessage = 'All entered data for this response will be lost.';
        this.modalType = 'discard';
        this.showModal = true;
    },
    
    // Confirm discard survey
    confirmDiscardSurvey() {
        this.clearDraft();
        this.formData = new FormData();
        this.closeModal();
        this.showHome();
    },
    
    // Export data
    async exportData() {
        try {
            if (this.responses.length === 0) {
                this.error = 'No data to export';
                return;
            }
            
            const csvContent = csv.generateCSV(this.responses, this.surveyData.questions);
            csv.downloadCSV(csvContent, `survey-data-${utils.getTimestamp().split('T')[0]}.csv`);
            
            utils.showSuccess('Data exported successfully!');
            
        } catch (error) {
            console.error('Export error:', error);
            this.error = 'Failed to export data';
        }
    },
    
    // Share data
    async shareData() {
        try {
            if (this.responses.length === 0) {
                this.error = 'No data to share';
                return;
            }
            
            const csvContent = csv.generateCSV(this.responses, this.surveyData.questions);
            await share.shareCSV(csvContent, `survey-data-${utils.getTimestamp().split('T')[0]}.csv`);
            
            utils.showSuccess('Data shared successfully!');
            
        } catch (error) {
            console.error('Share error:', error);
            this.error = 'Failed to share data';
        }
    },
    
    // Confirm delete data
    confirmDeleteData() {
        this.modalTitle = 'Delete All Data';
        this.modalMessage = 'This will permanently delete all stored responses. This action cannot be undone.';
        this.modalType = 'delete';
        this.deleteConfirmation = '';
        this.showModal = true;
    },
    
    // Delete all data
    async deleteAllData() {
        try {
            await db.deleteAllResponses();
            this.responses = [];
            this.responseCount = 0;
            this.closeModal();
            utils.showSuccess('All data deleted successfully!');
            this.showData();
        } catch (error) {
            console.error('Delete error:', error);
            this.error = 'Failed to delete data';
        }
    },
    
    // Show modal
    showModalDialog(title, message, type) {
        this.modalTitle = title;
        this.modalMessage = message;
        this.modalType = type;
        this.deleteConfirmation = '';
        this.showModal = true;
    },
    
    // Close modal
    closeModal() {
        this.showModal = false;
        this.modalTitle = '';
        this.modalMessage = '';
        this.modalType = '';
        this.deleteConfirmation = '';
    },
    
    // Confirm modal action
    confirmModal() {
        switch (this.modalType) {
            case 'discard':
                this.confirmDiscardSurvey();
                break;
            case 'delete':
                this.deleteAllData();
                break;
            default:
                this.closeModal();
        }
    },
    
    // Clear error
    clearError() {
        this.error = null;
    },
    
    // Clear success message
    clearSuccess() {
        this.successMessage = null;
    }
};
