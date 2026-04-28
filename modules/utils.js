// Utility functions for the survey app

export const utils = {
    // Generate UUID for response IDs
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // Get current ISO timestamp
    getTimestamp() {
        return new Date().toISOString();
    },

    // Format date for display
    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Escape CSV values
    escapeCSV(value) {
        if (value === null || value === undefined) return '';
        
        const stringValue = String(value);
        
        // If value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        
        return stringValue;
    },

    // Join checkbox values for CSV
    joinCheckboxValues(values) {
        if (!Array.isArray(values) || values.length === 0) return '';
        return values.join(';');
    },

    // Parse checkbox values from form data
    parseCheckboxValues(formData, questionId) {
        const values = [];
        const prefix = `${questionId}_`;
        
        for (const [key, value] of formData.entries()) {
            if (key.startsWith(prefix) && value) {
                values.push(key.replace(prefix, ''));
            }
        }
        
        return values;
    },

    // Validate form data
    validateForm(formData, questions) {
        const errors = [];
        
        for (const question of questions) {
            const value = formData.get(question.id);
            
            // Check required fields
            if (question.is_required && (!value || (Array.isArray(value) && value.length === 0))) {
                errors.push(`${question.title} is required`);
                continue;
            }
            
            // Validate number fields
            if (question.input_type === 'number' && value) {
                const numValue = parseInt(value, 10);
                if (isNaN(numValue)) {
                    errors.push(`${question.title} must be a valid number`);
                } else if (numValue < 0) {
                    errors.push(`${question.title} must be positive`);
                }
            }
        }
        
        return errors;
    },

    // Get visible questions based on conditional logic
    getVisibleQuestions(questions, formData) {
        const visible = [];
        
        for (const question of questions) {
            // If no parent, always visible
            if (!question.parent_question_id) {
                visible.push(question);
                continue;
            }
            
            // Check parent condition
            const parentValue = formData.get(question.parent_question_id);
            if (parentValue === 'Yes') {
                visible.push(question);
            }
        }
        
        return visible;
    },

    // Clear child questions when parent changes
    clearChildQuestions(parentId, questions, formData) {
        const childQuestions = questions.filter(q => q.parent_question_id === parentId);
        
        for (const child of childQuestions) {
            formData.delete(child.id);
            
            // Also clear checkbox values
            const keysToDelete = [];
            for (const key of formData.keys()) {
                if (key.startsWith(`${child.id}_`)) {
                    keysToDelete.push(key);
                }
            }
            
            for (const key of keysToDelete) {
                formData.delete(key);
            }
        }
    },

    // Get response display name
    getResponseDisplayName(response, questions) {
        // Try to find full_name first
        if (response.full_name) {
            return response.full_name;
        }
        
        // Fall back to first question's value
        const firstQuestion = questions.find(q => q.id === 'full_name') || questions[0];
        if (firstQuestion && response[firstQuestion.id]) {
            return response[firstQuestion.id];
        }
        
        return 'Unnamed Response';
    },

    // Show success message
    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    // Show error message
    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
            z-index: 1001;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    // Debounce function for auto-save
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Check if service worker is supported
    isServiceWorkerSupported() {
        return 'serviceWorker' in navigator;
    },

    // Check if Web Share API is supported
    isWebShareSupported() {
        return navigator.share !== undefined;
    },

    // Check if app is running in standalone mode
    isStandaloneMode() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    }
};
