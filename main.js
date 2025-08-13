// Global chart variable to track current chart instance
let chart = null;

// Handle Enter key press in input field
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Show/hide loading animation
function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = show ? 'block' : 'none';
}

// Add message to the chat interface
function addMessage(text, sender) {
    const messages = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = `<p>${text}</p>`;
    
    messages.appendChild(messageDiv);
    
    // Smooth scroll to new message
    messageDiv.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest'
    });
}

// Extract numerical values from text
function extractNumbers(text) {
    // More comprehensive regex to match various number formats
    const patterns = [
        /\$?[\d,]+(?:\.\d+)?[kKmMbB]?/g, // General numbers with optional currency and suffixes
        /[\d,]+(?:\.\d+)?%/g, // Percentages
        /[\d,]+(?:\.\d+)?/g // Plain numbers
    ];
    
    let matches = [];
    
    // Try each pattern
    for (const pattern of patterns) {
        const found = text.match(pattern);
        if (found && found.length > 0) {
            matches = found;
            break;
        }
    }
    
    if (!matches || matches.length === 0) return [];
    
    console.log('Matches Found:', matches); // Debug log
    
    return matches.map(match => {
        // Remove currency symbols, commas, and percentage signs
        let cleanNumber = match.replace(/[\$€£¥,%]/g, '');
        
        // Handle K, M, B suffixes
        let multiplier = 1;
        const lowerMatch = cleanNumber.toLowerCase();
        if (lowerMatch.includes('k')) {
            multiplier = 1000;
            cleanNumber = cleanNumber.toLowerCase().replace('k', '');
        } else if (lowerMatch.includes('m')) {
            multiplier = 1000000;
            cleanNumber = cleanNumber.toLowerCase().replace('m', '');
        } else if (lowerMatch.includes('b')) {
            multiplier = 1000000000;
            cleanNumber = cleanNumber.toLowerCase().replace('b', '');
        }
        
        const result = parseFloat(cleanNumber) * multiplier;
        console.log(`Converting ${match} to ${result}`); // Debug log
        return result;
    }).filter(num => !isNaN(num)); // Filter out NaN values
}

// Extract labels from text
function extractLabels(text, expectedCount) {
    console.log('Extracting labels from:', text, 'Expected count:', expectedCount); // Debug log
    
    // Split by common delimiters and look for label patterns
    const segments = text.split(/[,:;]/);
    let labels = [];
    
    // Try to find labels before colons or numbers
    for (const segment of segments) {
        // Look for word before number pattern
        const labelMatch = segment.match(/([a-zA-Z]+[a-zA-Z\s]*?)[\s]*(?=[\d\$€£¥])/);
        if (labelMatch) {
            labels.push(labelMatch[1].trim());
        }
    }
    
    // If we didn't find enough labels, try other patterns
    if (labels.length < expectedCount) {
        // Try month names
        const monthRegex = /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\b/gi;
        const monthMatches = text.match(monthRegex);
        if (monthMatches && monthMatches.length >= expectedCount) {
            labels = monthMatches.slice(0, expectedCount);
        }
        // Try day names
        else {
            const dayRegex = /\b(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday)\b/gi;
            const dayMatches = text.match(dayRegex);
            if (dayMatches && dayMatches.length >= expectedCount) {
                labels = dayMatches.slice(0, expectedCount);
            }
        }
    }
    
    // Fallback to generic labels
    while (labels.length < expectedCount) {
        labels.push(`Category ${labels.length + 1}`);
    }
    
    console.log('Extracted labels:', labels); // Debug log
    return labels.slice(0, expectedCount);
}

// Determine the best chart type based on input context
function determineChartType(input) {
    const lowerInput = input.toLowerCase();
    
    // Time-based data - use line chart
    if (lowerInput.includes('over time') || 
        lowerInput.includes('trend') ||
        lowerInput.includes('daily') ||
        lowerInput.includes('monthly') ||
        lowerInput.includes('weekly') ||
        lowerInput.includes('quarterly') ||
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(input) ||
        /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(input)) {
        return 'line';
    }
    
    // Percentage or survey data - use doughnut chart
    if (lowerInput.includes('percentage') || 
        lowerInput.includes('%') ||
        lowerInput.includes('survey') ||
        lowerInput.includes('rating') ||
        lowerInput.includes('satisfaction') ||
        lowerInput.includes('feedback')) {
        return 'doughnut';
    }
    
    // Default to bar chart for comparisons
    return 'bar';
}

// Create and display the chart visualization
function createVisualization(labels, data, originalInput) {
    console.log('Creating visualization with:', { labels, data, originalInput });
    
    try {
        // Show visualization container
        const visualizationElement = document.getElementById('visualization');
        if (!visualizationElement) {
            throw new Error('Visualization container not found');
        }
        visualizationElement.style.display = 'block';
        
        // Destroy existing chart if it exists
        if (chart) {
            console.log('Destroying existing chart');
            chart.destroy();
            chart = null;
        }

        const chartCanvas = document.getElementById('chart');
        if (!chartCanvas) {
            console.error('Chart canvas element not found');
            console.log('Available elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
            throw new Error('Chart canvas not found');
        }
        console.log('Chart canvas found:', chartCanvas);
        
        // Set canvas dimensions
        chartCanvas.width = 400;
        chartCanvas.height = 215;
        
        const ctx = chartCanvas.getContext('2d');
        if (!ctx) {
            console.error('Failed to get canvas context');
            throw new Error('Could not get 2D context from chart canvas');
        }
        console.log('2D context obtained:', ctx);
        const chartType = determineChartType(originalInput);
        
        console.log('Chart type determined:', chartType);
        
        // Color schemes for different chart types
        const colors = {
            pink: ['#ff69b4', '#ff1493', '#c71585', '#d8bfd8', '#dda0dd'],
            gradient: 'rgba(255, 105, 180, 0.6)',
            border: '#ff69b4'
        };

        const config = {
            type: chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Data',
                    data: data,
                    backgroundColor: chartType === 'doughnut' ? 
                        colors.pink.slice(0, data.length) :
                        colors.gradient,
                    borderColor: colors.border,
                    borderWidth: 2,
                    tension: chartType === 'line' ? 0.4 : 0,
                    // Additional styling for different chart types
                    ...(chartType === 'line' && {
                        fill: false,
                        pointBackgroundColor: colors.border,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: colors.border,
                    }),
                    ...(chartType === 'bar' && {
                        borderRadius: 4,
                        borderSkipped: false,
                    })
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: chartType === 'doughnut',
                        labels: {
                            color: '#e0e0e0',
                            padding: 20,
                            usePointStyle: true,
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ff69b4',
                        bodyColor: '#e0e0e0',
                        borderColor: '#ff69b4',
                        borderWidth: 1,
                    }
                },
                // Scale configuration for non-doughnut charts
                scales: chartType !== 'doughnut' ? {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#888',
                            callback: function(value) {
                                // Format large numbers
                                if (value >= 1000000) {
                                    return (value / 1000000).toFixed(1) + 'M';
                                } else if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K';
                                }
                                return value;
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                        }
                    },
                    x: {
                        ticks: {
                            color: '#888',
                            maxRotation: 45,
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                        }
                    }
                } : {},
                // Animation configuration
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        };

        console.log('Chart config created:', config);

        // Create the chart
        chart = new Chart(ctx, config);
        console.log('Chart created successfully');
        
        // Smooth scroll to visualization
        visualizationElement.scrollIntoView({ 
            behavior: 'smooth',
            block: 'nearest'
        });
        
    } catch (error) {
        console.error('Error in createVisualization:', error);
        console.error('Error stack:', error.stack);
        throw error; // Re-throw to be caught by processData
    }
}

// Process user input and extract data
function processData(input) {
    console.log('Processing input:', input);
    try {
        // Extract numbers from input (supports various formats)
        const numbers = extractNumbers(input);
        console.log('Extracted numbers:', numbers);

        if (numbers && numbers.length > 0) {
            const labels = extractLabels(input, numbers.length);
            console.log('Extracted labels:', labels);

            createVisualization(labels, numbers, input);
            addMessage(`Perfect! Here is your chart based on the provided data: ${labels.join(', ')} with values ${numbers.join(', ')}`, 'assistant');
        } else {
            addMessage('I couldn\'t extract numerical data from your input. Try providing data in formats like: "Sales: Jan 100, Feb 150, Mar 120" or paste CSV data.', 'assistant');
        }
    } catch (error) {
        console.error('Error processing data:', error);
        addMessage('Sorry, there was an error processing your data. Please try a different format.', 'assistant');
    }
}

// Main function to send user message and process data
function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    // Don't process empty messages
    if (!message) return;

    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input field
    input.value = '';

    // Show loading animation
    showLoading(true);

    // Simulate processing time (in real app, this would be API call)
    setTimeout(() => {
        showLoading(false);
        processData(message);
    }, 900);
}

// Example data sets for quick testing
function useExample(type) {
    const examples = {
        sales: 'Show me a chart of monthly sales data: Jan: $45K, Feb: $52K, Mar: $38K, Apr: $61K, May: $55K, Jun: $72K',
        survey: 'Visualize survey results: Excellent: 55%, Good: 33%, Average: 12%, Poor: 5%, Very Poor: 2%',
        website: 'Website traffic over 6 months: Jan: 12.5K visitors, Feb: 14.2K, Mar: 16.8K, Apr: 13.1K, May: 18.9K, Jun: 21.3K',
        fitness: 'My daily step count last week: Mon: 8,500, Tue: 12,300, Wed: 6,800, Thu: 11,200, Fri: 9,600, Sat: 15,400, Sun: 7,900'
    };
    
    const inputField = document.getElementById('userInput');
    inputField.value = examples[type];
    sendMessage();
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Focus on input field when page loads
    const inputField = document.getElementById('userInput');
    if (inputField) {
        inputField.focus();
    }
    
    // Add any initialization code here
    console.log('DataViz application initialized');
});

// Handle window resize for responsive charts
window.addEventListener('resize', function() {
    if (chart) {
        chart.resize();
    }
});

function createGrid() {
            const gridContainer = document.getElementById('gridLines');
            const spacing = 80;
            
            // Horizontal lines
            for (let i = 0; i < window.innerHeight; i += spacing) {
                const line = document.createElement('div');
                line.className = 'grid-line-horizontal';
                line.style.top = i + 'px';
                line.style.animationDelay = (i / spacing * 0.2) + 's';
                gridContainer.appendChild(line);
            }
            
            // Vertical lines
            for (let i = 0; i < window.innerWidth; i += spacing) {
                const line = document.createElement('div');
                line.className = 'grid-line-vertical';
                line.style.left = i + 'px';
                line.style.animationDelay = (i / spacing * 0.2) + 's';
                gridContainer.appendChild(line);
            }
        }

        // Create floating particles
        function createParticles() {
            const container = document.getElementById('particles');
            const particleCount = 15;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 8 + 's';
                particle.style.animationDuration = (8 + Math.random() * 4) + 's';
                container.appendChild(particle);
            }
        }

        // Create data nodes with connections
        function createDataNodes() {
            const container = document.getElementById('dataNodes');
            const nodeCount = 12;
            const nodes = [];
            
            // Create nodes
            for (let i = 0; i < nodeCount; i++) {
                const node = document.createElement('div');
                node.className = 'node';
                const x = Math.random() * (window.innerWidth - 50) + 25;
                const y = Math.random() * (window.innerHeight - 50) + 25;
                node.style.left = x + 'px';
                node.style.top = y + 'px';
                node.style.animationDelay = Math.random() * 3 + 's';
                container.appendChild(node);
                nodes.push({element: node, x: x, y: y});
            }

            // Create connection lines
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    const line = document.createElement('div');
                    line.className = 'connection-line';
                    const startX = Math.random() * window.innerWidth;
                    const y = Math.random() * window.innerHeight;
                    const width = 200 + Math.random() * 300;
                    
                    line.style.left = startX + 'px';
                    line.style.top = y + 'px';
                    line.style.width = width + 'px';
                    line.style.animationDelay = Math.random() * 6 + 's';
                    container.appendChild(line);
                    
                    // Remove and recreate line after animation
                    setTimeout(() => {
                        if (container.contains(line)) {
                            container.removeChild(line);
                        }
                    }, 6000);
                }, i * 1000);
            }
        }

        // Recreate connection lines periodically
        function maintainConnections() {
            setInterval(() => {
                const container = document.getElementById('dataNodes');
                const line = document.createElement('div');
                line.className = 'connection-line';
                const startX = Math.random() * window.innerWidth;
                const y = Math.random() * window.innerHeight;
                const width = 200 + Math.random() * 300;
                
                line.style.left = startX + 'px';
                line.style.top = y + 'px';
                line.style.width = width + 'px';
                container.appendChild(line);
                
                setTimeout(() => {
                    if (container.contains(line)) {
                        container.removeChild(line);
                    }
                }, 6000);
            }, 2000);
        }

        // Initialize everything
        createGrid();
        createParticles();
        createDataNodes();
        maintainConnections();

        // Handle window resize
        window.addEventListener('resize', () => {
            document.getElementById('gridLines').innerHTML = '';
            createGrid();
        });