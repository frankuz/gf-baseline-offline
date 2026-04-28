// Survey rendering and form logic

export const survey = {
    // Render survey form
    renderForm(questions, formData) {
        const container = document.getElementById('questionsContainer');
        container.innerHTML = '';
        
        // Group questions by parent/child relationships
        const rootQuestions = questions.filter(q => !q.parent_question_id);
        const childQuestions = questions.filter(q => q.parent_question_id);
        
        // Render root questions first
        for (const question of rootQuestions) {
            this.renderQuestion(question, container, formData, childQuestions);
        }
        
        // Render child questions (initially hidden)
        for (const question of childQuestions) {
            this.renderQuestion(question, container, formData, []);
        }
        
        // Set up form change listeners
        this.setupFormListeners(questions, formData);
        
        // Update visibility based on current form data
        this.updateQuestionVisibility(questions, formData);
    },
    
    // Render individual question
    renderQuestion(question, container, formData, childQuestions) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-group';
        questionDiv.id = `question-${question.id}`;
        
        // Add child class for conditional questions
        if (question.parent_question_id) {
            questionDiv.classList.add('child-question');
        }
        
        // Question label
        const label = document.createElement('label');
        label.className = 'question-label';
        label.htmlFor = question.id;
        label.textContent = question.title;
        
        if (question.is_required) {
            const required = document.createElement('span');
            required.className = 'required-indicator';
            required.textContent = ' *';
            label.appendChild(required);
        }
        
        questionDiv.appendChild(label);
        
        // Question details
        if (question.details) {
            const details = document.createElement('div');
            details.className = 'question-details';
            details.textContent = question.details;
            questionDiv.appendChild(details);
        }
        
        // Question input based on type
        const inputContainer = document.createElement('div');
        inputContainer.className = 'input-container';
        
        switch (question.input_type) {
            case 'text':
                this.renderTextInput(question, inputContainer, formData);
                break;
            case 'number':
                this.renderNumberInput(question, inputContainer, formData);
                break;
            case 'radio':
                this.renderRadioInput(question, inputContainer, formData);
                break;
            case 'checkbox':
                this.renderCheckboxInput(question, inputContainer, formData);
                break;
            case 'textarea':
                this.renderTextareaInput(question, inputContainer, formData);
                break;
            default:
                console.warn(`Unknown input type: ${question.input_type}`);
                this.renderTextInput(question, inputContainer, formData);
        }
        
        questionDiv.appendChild(inputContainer);
        container.appendChild(questionDiv);
        
        // Add child questions after this question
        const directChildren = childQuestions.filter(q => q.parent_question_id === question.id);
        for (const child of directChildren) {
            this.renderQuestion(child, container, formData, []);
        }
    },
    
    // Render text input
    renderTextInput(question, container, formData) {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = question.id;
        input.name = question.id;
        input.className = 'form-input';
        input.value = formData.get(question.id) || '';
        
        input.addEventListener('input', (e) => {
            formData.set(question.id, e.target.value);
        });
        
        container.appendChild(input);
    },
    
    // Render number input
    renderNumberInput(question, container, formData) {
        const input = document.createElement('input');
        input.type = 'number';
        input.id = question.id;
        input.name = question.id;
        input.className = 'form-input';
        input.value = formData.get(question.id) || '';
        
        // Only allow integers
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value === '' || /^\d+$/.test(value)) {
                formData.set(question.id, value);
            } else {
                e.target.value = formData.get(question.id) || '';
            }
        });
        
        container.appendChild(input);
    },
    
    // Render radio input
    renderRadioInput(question, container, formData) {
        const radioGroup = document.createElement('div');
        radioGroup.className = 'radio-group';
        
        const options = question.options.split(',');
        const currentValue = formData.get(question.id);
        
        for (const option of options) {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'radio-option';
            
            const input = document.createElement('input');
            input.type = 'radio';
            input.id = `${question.id}_${option}`;
            input.name = question.id;
            input.value = option;
            input.checked = currentValue === option;
            
            input.addEventListener('change', (e) => {
                if (e.target.checked) {
                    formData.set(question.id, option);
                    this.handleParentChange(question.id, option, formData);
                }
            });
            
            const label = document.createElement('label');
            label.htmlFor = `${question.id}_${option}`;
            label.textContent = option;
            
            optionDiv.appendChild(input);
            optionDiv.appendChild(label);
            radioGroup.appendChild(optionDiv);
        }
        
        container.appendChild(radioGroup);
    },
    
    // Render checkbox input
    renderCheckboxInput(question, container, formData) {
        const checkboxGroup = document.createElement('div');
        checkboxGroup.className = 'checkbox-group';
        
        const options = question.options.split(',');
        const currentValues = this.parseCheckboxValues(formData, question.id);
        
        for (const option of options) {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'checkbox-option';
            
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `${question.id}_${option}`;
            input.name = `${question.id}_${option}`;
            input.value = option;
            input.checked = currentValues.includes(option);
            
            input.addEventListener('change', (e) => {
                this.handleCheckboxChange(question, option, e.target.checked, formData);
            });
            
            const label = document.createElement('label');
            label.htmlFor = `${question.id}_${option}`;
            label.textContent = option;
            
            optionDiv.appendChild(input);
            optionDiv.appendChild(label);
            checkboxGroup.appendChild(optionDiv);
        }
        
        container.appendChild(checkboxGroup);
    },
    
    // Render textarea input
    renderTextareaInput(question, container, formData) {
        const textarea = document.createElement('textarea');
        textarea.id = question.id;
        textarea.name = question.id;
        textarea.className = 'form-textarea';
        textarea.value = formData.get(question.id) || '';
        
        textarea.addEventListener('input', (e) => {
            formData.set(question.id, e.target.value);
        });
        
        container.appendChild(textarea);
    },
    
    // Parse checkbox values from form data
    parseCheckboxValues(formData, questionId) {
        const values = [];
        const prefix = `${questionId}_`;
        
        for (const [key, value] of formData.entries()) {
            if (key.startsWith(prefix) && value === 'on') {
                values.push(key.replace(prefix, ''));
            }
        }
        
        return values;
    },
    
    // Handle checkbox change
    handleCheckboxChange(question, option, checked, formData) {
        const key = `${question.id}_${option}`;
        
        if (checked) {
            formData.set(key, 'on');
        } else {
            formData.delete(key);
        }
    },
    
    // Handle parent question change
    handleParentChange(parentId, value, formData) {
        // Clear child questions when parent changes to No
        if (value === 'No') {
            utils.clearChildQuestions(parentId, this.questions, formData);
        }
        
        // Update visibility
        this.updateQuestionVisibility(this.questions, formData);
    },
    
    // Update question visibility based on conditional logic
    updateQuestionVisibility(questions, formData) {
        for (const question of questions) {
            if (!question.parent_question_id) {
                continue; // Root questions are always visible
            }
            
            const questionElement = document.getElementById(`question-${question.id}`);
            if (!questionElement) {
                continue;
            }
            
            const parentValue = formData.get(question.parent_question_id);
            const isVisible = parentValue === 'Yes';
            
            if (isVisible) {
                questionElement.classList.remove('hidden');
            } else {
                questionElement.classList.add('hidden');
            }
        }
    },
    
    // Set up form change listeners
    setupFormListeners(questions, formData) {
        this.questions = questions;
        
        // Listen to all form inputs
        const form = document.getElementById('surveyForm');
        if (!form) {
            return;
        }
        
        // Debounced auto-save
        const debouncedSave = utils.debounce(() => {
            state.saveDraft();
        }, 1000);
        
        form.addEventListener('input', (e) => {
            debouncedSave();
        });
        
        form.addEventListener('change', (e) => {
            debouncedSave();
        });
    },
    
    // Validate form
    validateForm(formData, questions) {
        const errors = [];
        const visibleQuestions = utils.getVisibleQuestions(questions, formData);
        
        for (const question of visibleQuestions) {
            const value = formData.get(question.id);
            
            // Check required fields
            if (question.is_required) {
                if (question.input_type === 'checkbox') {
                    const checkboxValues = this.parseCheckboxValues(formData, question.id);
                    if (checkboxValues.length === 0) {
                        errors.push(`${question.title} is required`);
                    }
                } else if (!value) {
                    errors.push(`${question.title} is required`);
                }
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
    
    // Get form data as object
    getFormDataAsObject(formData, questions) {
        const data = {};
        
        for (const question of questions) {
            const value = formData.get(question.id);
            
            if (question.input_type === 'checkbox') {
                const checkboxValues = this.parseCheckboxValues(formData, question.id);
                data[question.id] = utils.joinCheckboxValues(checkboxValues);
            } else if (value) {
                data[question.id] = question.input_type === 'number' ? 
                    parseInt(value, 10) : value;
            }
        }
        
        return data;
    },
    
    // Reset form
    resetForm(formData) {
        const form = document.getElementById('surveyForm');
        if (form) {
            form.reset();
        }
        
        formData = new FormData();
        
        // Clear all checkbox values
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Update visibility
        this.updateQuestionVisibility(this.questions, formData);
    },
    
    // Focus first required field
    focusFirstRequiredField(questions) {
        const visibleQuestions = utils.getVisibleQuestions(questions, state.formData);
        const firstRequired = visibleQuestions.find(q => q.is_required);
        
        if (firstRequired) {
            const element = document.getElementById(firstRequired.id);
            if (element) {
                element.focus();
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    },
    
    // Scroll to first error
    scrollToFirstError(errors, questions) {
        if (errors.length === 0) {
            return;
        }
        
        // Extract question title from first error
        const firstError = errors[0];
        const questionTitle = firstError.replace(' is required', '').replace(' must be a valid number', '');
        
        const question = questions.find(q => q.title === questionTitle);
        if (question) {
            const element = document.getElementById(`question-${question.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Highlight the question
                element.classList.add('error-highlight');
                setTimeout(() => {
                    element.classList.remove('error-highlight');
                }, 3000);
            }
        }
    }
};
