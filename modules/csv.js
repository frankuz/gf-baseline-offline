// CSV export functionality

export const csv = {
    // Generate CSV content from responses
    generateCSV(responses, questions) {
        if (!responses || responses.length === 0) {
            throw new Error('No responses to export');
        }
        
        // Create headers row
        const headers = this.generateHeaders(questions);
        
        // Create data rows
        const rows = responses.map(response => this.generateRow(response, questions));
        
        // Combine headers and rows
        const csvContent = [headers, ...rows].join('\n');
        
        return csvContent;
    },
    
    // Generate CSV headers
    generateHeaders(questions) {
        const headers = ['ID', 'Timestamp', 'Full Name'];
        
        // Add question headers
        for (const question of questions) {
            if (question.id !== 'full_name') {
                headers.push(question.title);
            }
        }
        
        return headers.map(header => utils.escapeCSV(header)).join(',');
    },
    
    // Generate CSV row for a single response
    generateRow(response, questions) {
        const row = [];
        
        // Add basic fields
        row.push(utils.escapeCSV(response.id || ''));
        row.push(utils.escapeCSV(utils.formatDate(response.timestamp)));
        row.push(utils.escapeCSV(response.full_name || ''));
        
        // Add question answers
        for (const question of questions) {
            if (question.id === 'full_name') {
                continue; // Already added as Full Name
            }
            
            const value = response[question.id] || '';
            row.push(utils.escapeCSV(value));
        }
        
        return row.join(',');
    },
    
    // Download CSV file
    downloadCSV(csvContent, filename) {
        // Create blob
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
    },
    
    // Generate CSV with specific questions only
    generateCSVWithQuestions(responses, selectedQuestions) {
        if (!responses || responses.length === 0) {
            throw new Error('No responses to export');
        }
        
        // Create headers
        const headers = ['ID', 'Timestamp', 'Full Name'];
        for (const question of selectedQuestions) {
            if (question.id !== 'full_name') {
                headers.push(question.title);
            }
        }
        
        // Create data rows
        const rows = responses.map(response => {
            const row = [
                utils.escapeCSV(response.id || ''),
                utils.escapeCSV(utils.formatDate(response.timestamp)),
                utils.escapeCSV(response.full_name || '')
            ];
            
            for (const question of selectedQuestions) {
                if (question.id === 'full_name') {
                    continue;
                }
                
                const value = response[question.id] || '';
                row.push(utils.escapeCSV(value));
            }
            
            return row.join(',');
        });
        
        return [headers.join(','), ...rows].join('\n');
    },
    
    // Generate summary CSV
    generateSummaryCSV(responses, questions) {
        if (!responses || responses.length === 0) {
            throw new Error('No responses to analyze');
        }
        
        const summary = [];
        
        // Basic stats
        summary.push(['Total Responses', responses.length]);
        summary.push(['Export Date', utils.formatDate(utils.getTimestamp())]);
        summary.push(['', '']); // Empty row
        
        // Question statistics
        for (const question of questions) {
            const values = responses.map(r => r[question.id]).filter(v => v !== undefined && v !== '');
            
            if (values.length === 0) {
                summary.push([question.title, 'No responses']);
                continue;
            }
            
            if (question.input_type === 'number') {
                const numbers = values.map(v => parseInt(v, 10)).filter(n => !isNaN(n));
                if (numbers.length > 0) {
                    const sum = numbers.reduce((a, b) => a + b, 0);
                    const avg = sum / numbers.length;
                    const min = Math.min(...numbers);
                    const max = Math.max(...numbers);
                    
                    summary.push([question.title, `Count: ${numbers.length}, Avg: ${avg.toFixed(1)}, Min: ${min}, Max: ${max}`]);
                } else {
                    summary.push([question.title, `Count: 0`]);
                }
            } else if (question.input_type === 'checkbox') {
                const optionCounts = {};
                
                for (const value of values) {
                    const options = value.split(';');
                    for (const option of options) {
                        const trimmed = option.trim();
                        if (trimmed) {
                            optionCounts[trimmed] = (optionCounts[trimmed] || 0) + 1;
                        }
                    }
                }
                
                const counts = Object.entries(optionCounts)
                    .map(([option, count]) => `${option}: ${count}`)
                    .join(', ');
                
                summary.push([question.title, counts || 'No selections']);
            } else {
                // Text, radio, textarea
                const uniqueValues = [...new Set(values)];
                const valueCounts = {};
                
                for (const value of uniqueValues) {
                    valueCounts[value] = values.filter(v => v === value).length;
                }
                
                const counts = Object.entries(valueCounts)
                    .map(([value, count]) => `${value}: ${count}`)
                    .join(', ');
                
                summary.push([question.title, counts]);
            }
        }
        
        // Convert to CSV
        const csvRows = summary.map(([label, value]) => 
            `${utils.escapeCSV(label)},${utils.escapeCSV(value)}`
        );
        
        return csvRows.join('\n');
    },
    
    // Validate CSV content
    validateCSV(csvContent) {
        if (!csvContent || typeof csvContent !== 'string') {
            throw new Error('Invalid CSV content');
        }
        
        const lines = csvContent.split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must have at least a header and one data row');
        }
        
        return true;
    },
    
    // Parse CSV content (basic implementation)
    parseCSV(csvContent) {
        const lines = csvContent.split('\n');
        const headers = this.parseCSVLine(lines[0]);
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = this.parseCSVLine(line);
                const row = {};
                
                for (let j = 0; j < headers.length; j++) {
                    row[headers[j]] = values[j] || '';
                }
                
                data.push(row);
            }
        }
        
        return data;
    },
    
    // Parse a single CSV line (handles quoted values)
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add last field
        result.push(current.trim());
        
        return result;
    }
};
