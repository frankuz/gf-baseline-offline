// Web Share API integration for file sharing

export const share = {
    // Share CSV file using Web Share API
    async shareCSV(csvContent, filename) {
        try {
            // Check if Web Share API is supported
            if (!utils.isWebShareSupported()) {
                throw new Error('Web Share API not supported');
            }
            
            // Create file blob
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const file = new File([blob], filename, { type: 'text/csv' });
            
            // Share the file
            await navigator.share({
                title: 'Survey Data',
                text: `Survey data export with ${filename}`,
                files: [file]
            });
            
            return true;
            
        } catch (error) {
            console.error('Share error:', error);
            
            // Handle user cancellation
            if (error.name === 'AbortError') {
                return false; // User cancelled sharing
            }
            
            // Fallback to download if share fails
            this.fallbackToDownload(csvContent, filename);
            return true;
        }
    },
    
    // Share JSON data using Web Share API
    async shareJSON(jsonContent, filename) {
        try {
            if (!utils.isWebShareSupported()) {
                throw new Error('Web Share API not supported');
            }
            
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const file = new File([blob], filename, { type: 'application/json' });
            
            await navigator.share({
                title: 'Survey Data',
                text: `Survey data export with ${filename}`,
                files: [file]
            });
            
            return true;
            
        } catch (error) {
            console.error('Share error:', error);
            
            if (error.name === 'AbortError') {
                return false;
            }
            
            this.fallbackToDownload(jsonContent, filename);
            return true;
        }
    },
    
    // Share text using Web Share API
    async shareText(text, title = 'Survey Data') {
        try {
            if (!utils.isWebShareSupported()) {
                throw new Error('Web Share API not supported');
            }
            
            await navigator.share({
                title: title,
                text: text
            });
            
            return true;
            
        } catch (error) {
            console.error('Share error:', error);
            
            if (error.name === 'AbortError') {
                return false;
            }
            
            // Fallback to clipboard
            this.fallbackToClipboard(text);
            return true;
        }
    },
    
    // Share multiple files
    async shareFiles(files, title = 'Survey Data') {
        try {
            if (!utils.isWebShareSupported()) {
                throw new Error('Web Share API not supported');
            }
            
            await navigator.share({
                title: title,
                files: files
            });
            
            return true;
            
        } catch (error) {
            console.error('Share error:', error);
            
            if (error.name === 'AbortError') {
                return false;
            }
            
            // Download first file as fallback
            if (files.length > 0) {
                const file = files[0];
                const reader = new FileReader();
                reader.onload = () => {
                    this.fallbackToDownload(reader.result, file.name);
                };
                reader.readAsText(file);
            }
            
            return true;
        }
    },
    
    // Fallback to download when share is not supported
    fallbackToDownload(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        utils.showSuccess('File downloaded instead of sharing');
    },
    
    // Fallback to clipboard when share is not supported
    fallbackToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                utils.showSuccess('Text copied to clipboard');
            }).catch(() => {
                this.fallbackToTextArea(text);
            });
        } else {
            this.fallbackToTextArea(text);
        }
    },
    
    // Fallback to textarea for copying
    fallbackToTextArea(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            utils.showSuccess('Text copied to clipboard');
        } catch (error) {
            console.error('Copy failed:', error);
            utils.showError('Failed to copy text');
        }
        
        document.body.removeChild(textarea);
    },
    
    // Check if sharing is available
    isShareAvailable() {
        return utils.isWebShareSupported();
    },
    
    // Get share capabilities
    getShareCapabilities() {
        const capabilities = {
            canShare: utils.isWebShareSupported(),
            canShareFiles: false,
            canShareText: false
        };
        
        if (capabilities.canShare) {
            // Test file sharing capability
            capabilities.canShareFiles = navigator.canShare && navigator.canShare({ files: [] });
            capabilities.canShareText = true;
        }
        
        return capabilities;
    },
    
    // Share survey response
    async shareResponse(response, questions) {
        try {
            // Format response as text
            let text = `Survey Response - ${utils.formatDate(response.timestamp)}\n\n`;
            
            for (const question of questions) {
                const value = response[question.id];
                if (value) {
                    text += `${question.title}: ${value}\n`;
                }
            }
            
            return await this.shareText(text, 'Survey Response');
            
        } catch (error) {
            console.error('Response share error:', error);
            throw error;
        }
    },
    
    // Share multiple responses
    async shareMultipleResponses(responses, questions) {
        try {
            let text = `Survey Data - ${responses.length} responses\n`;
            text += `Exported: ${utils.formatDate(utils.getTimestamp())}\n\n`;
            
            for (const response of responses) {
                text += `--- Response ${response.id} ---\n`;
                text += `Date: ${utils.formatDate(response.timestamp)}\n`;
                
                for (const question of questions) {
                    const value = response[question.id];
                    if (value) {
                        text += `${question.title}: ${value}\n`;
                    }
                }
                
                text += '\n';
            }
            
            return await this.shareText(text, 'Survey Data');
            
        } catch (error) {
            console.error('Multiple responses share error:', error);
            throw error;
        }
    },
    
    // Create shareable link (for future web implementation)
    createShareableLink(responses) {
        // This would be used if we had a backend to generate shareable links
        // For now, return a placeholder
        const data = btoa(JSON.stringify(responses));
        return `${window.location.origin}?shared=${data}`;
    },
    
    // Handle share from URL parameters
    async handleSharedFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = urlParams.get('shared');
        
        if (sharedData) {
            try {
                const responses = JSON.parse(atob(sharedData));
                // Import shared responses
                await db.importResponsesFromJSON(JSON.stringify(responses));
                utils.showSuccess('Shared data imported successfully');
                return true;
            } catch (error) {
                console.error('Import error:', error);
                utils.showError('Failed to import shared data');
                return false;
            }
        }
        
        return false;
    }
};
