document.addEventListener('DOMContentLoaded', function() {
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');

    if (!cursor || !cursorFollower) return;

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';

        // Add a slight delay to follower for smooth effect
        setTimeout(() => {
            cursorFollower.style.left = e.clientX + 'px';
            cursorFollower.style.top = e.clientY + 'px';
        }, 50);
    });

    // Handle cursor hover effects
    const hoverElements = document.querySelectorAll('a, button, .btn, .card, .project-card, .interest-card, .social-icon, input, textarea, select, .nav-link, .theme-toggle');

    hoverElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
            cursorFollower.style.width = '32px';
            cursorFollower.style.height = '32px';
            cursorFollower.style.borderWidth = '2px';
            cursorFollower.style.opacity = '0.5';
        });

        element.addEventListener('mouseleave', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1)';
            cursorFollower.style.width = '24px';
            cursorFollower.style.height = '24px';
            cursorFollower.style.borderWidth = '1px';
            cursorFollower.style.opacity = '1';
        });
    });

    // Handle cursor visibility when leaving/entering the window
    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = '1';
        cursorFollower.style.opacity = '1';
    });

    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
        cursorFollower.style.opacity = '0';
    });

    // Typewriter effect
    const typewriterText = document.getElementById('typewriter-text');
    const phrases = [
        'Developer',
        'Linux Enthusiast',
        'Community Builder',
        'Go Programmer',
        'Accessibility Advocate'
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function typeWriter() {
        const currentPhrase = phrases[phraseIndex];

        if (isDeleting) {
            typewriterText.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50;
        } else {
            typewriterText.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100;
        }

        if (!isDeleting && charIndex === currentPhrase.length) {
            isDeleting = true;
            typingSpeed = 1000; // Pause at the end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typingSpeed = 500; // Pause before typing next phrase
        }

        setTimeout(typeWriter, typingSpeed);
    }

    typeWriter();

    // Animate stats counter
    const stats = document.querySelectorAll('.stat-number');

    function animateStats() {
        const stats = document.querySelectorAll('.stat-number');
    
        stats.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-count'));
            let current = 0;
            const duration = 2000; // Animation duration in milliseconds
            const frameDuration = 1000 / 60; // 60fps
            const totalFrames = Math.round(duration / frameDuration);
            let frame = 0;
    
            // Use requestAnimationFrame for smoother animation
            function animate() {
                frame++;
                // Use easeOutQuad easing function for a natural slowdown effect
                const progress = frame / totalFrames;
                const easing = 1 - Math.pow(1 - progress, 3); // Cubic ease out
                current = Math.round(easing * target);
    
                // Format the number with commas for thousands
                stat.textContent = current.toLocaleString();
    
                if (frame < totalFrames) {
                    requestAnimationFrame(animate);
                } else {
                    stat.textContent = target.toLocaleString();
                }
            }
    
            // Start the animation
            requestAnimationFrame(animate);
        });
    }

    // Initialize the animation when the stats section is in view
    function initStatsAnimation() {
    const statsSection = document.querySelector('.about-stats');
    if (!statsSection) return;

    // Use Intersection Observer to trigger animation when scrolled into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, { threshold: 0.2 }); // Trigger when 20% of the element is visible

    observer.observe(statsSection);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initStatsAnimation();
});

    // Animate skill bars
    const skillLevels = document.querySelectorAll('.skill-level');

    function animateSkillBars() {
        skillLevels.forEach(skill => {
            const level = skill.getAttribute('data-level') + '%';
            skill.style.width = level;
        });
    }

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.id === 'about') {
                    animateStats();
                } else if (entry.target.id === 'skills') {
                    animateSkillBars();
                }
            }
        });
    }, observerOptions);

    observer.observe(document.getElementById('about'));
    observer.observe(document.getElementById('skills'));

    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;

    themeToggle.addEventListener('click', function() {
        if (body.getAttribute('data-theme') === 'light') {
            body.removeAttribute('data-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            body.setAttribute('data-theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Header scroll effect
    const header = document.querySelector('header');

    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Form submission handling
    const contactForm = document.querySelector('.contact-form form');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form values
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;

            // Simple validation
            if (!name || !email || !message) {
                alert('Please fill in all fields');
                return;
            }

            // Here you would typically send the form data to a server
            // For demo purposes, we'll just show a success message

            // Reset form
            contactForm.reset();

            // Show success message
            alert('Message sent successfully! (Demo only)');
        });
    }

    // Reveal animations on scroll
    const revealElements = document.querySelectorAll('.project-card, .skill-item, .interest-category');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    revealElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        revealObserver.observe(element);
    });

    // Terminal typing effect
    const terminalCommands = document.querySelectorAll('.terminal .command:not(.blink)');

    terminalCommands.forEach(command => {
        const text = command.textContent;
        command.textContent = '';

        let i = 0;
        const typeCommand = () => {
            if (i < text.length) {
                command.textContent += text.charAt(i);
                i++;
                setTimeout(typeCommand, Math.random() * 50 + 50);
            }
        };

        setTimeout(typeCommand, 500);
    });

    // Mouse parallax effect for hero section
    const heroSection = document.getElementById('hero');

    heroSection.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX / window.innerWidth - 0.5;
        const mouseY = e.clientY / window.innerHeight - 0.5;

        const depth = 20;
        const terminal = document.querySelector('.hero-image .terminal');

        if (terminal) {
            terminal.style.transform = `perspective(1000px) rotateY(${-mouseX * depth}deg) rotateX(${mouseY * depth}deg)`;
        }
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.createElement('div');
    mobileMenuToggle.className = 'mobile-menu-toggle';
    mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';

    const nav = document.querySelector('nav');

    // Only add mobile menu for smaller screens
    if (window.innerWidth <= 768) {
        header.querySelector('.container').insertBefore(mobileMenuToggle, nav);

        mobileMenuToggle.addEventListener('click', function() {
            nav.classList.toggle('active');

            if (nav.classList.contains('active')) {
                mobileMenuToggle.innerHTML = '<i class="fas fa-times"></i>';
            } else {
                mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });

        // Close mobile menu when clicking a nav link
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', function() {
                nav.classList.remove('active');
                mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
    }

    // Add CSS for mobile menu
    if (window.innerWidth <= 768) {
        const style = document.createElement('style');
        style.textContent = `
            .mobile-menu-toggle {
                display: block;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-primary);
                z-index: 1001;
            }

            nav {
                position: fixed;
                top: 0;
                right: -100%;
                width: 70%;
                height: 100vh;
                background-color: var(--bg-secondary);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                transition: right 0.3s ease;
                z-index: 1000;
            }

            nav.active {
                right: 0;
            }

            nav ul {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2rem;
            }

            nav ul li {
                margin: 0;
            }

            nav ul li a {
                font-size: 1.2rem;
            }
        `;
        document.head.appendChild(style);
    }

    // Preloader
    const preloader = document.createElement('div');
    preloader.className = 'preloader';
    preloader.innerHTML = `
        <div class="preloader-content">
            <div class="logo-text">micr0<span class="accent">byte</span></div>
            <div class="loading-bar">
                <div class="loading-progress"></div>
            </div>
        </div>
    `;
    document.body.appendChild(preloader);

    // Add CSS for preloader
    const preloaderStyle = document.createElement('style');
    preloaderStyle.textContent = `
        .preloader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: var(--bg-primary);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            transition: opacity 0.5s ease, visibility 0.5s ease;
        }

        .preloader-content {
            text-align: center;
        }

        .preloader .logo-text {
            font-family: var(--font-mono);
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 2rem;
            background: linear-gradient(to right, var(--text-primary), var(--accent-primary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .loading-bar {
            width: 200px;
            height: 4px;
            background-color: var(--bg-secondary);
            border-radius: 2px;
            overflow: hidden;
            margin: 0 auto;
        }

        .loading-progress {
            height: 100%;
            width: 0;
            background: linear-gradient(to right, var(--accent-primary), var(--accent-secondary));
            animation: loading 1.5s ease forwards;
        }

        @keyframes loading {
            0% { width: 0; }
            100% { width: 100%; }
        }
    `;
    document.head.appendChild(preloaderStyle);

    // Hide preloader after loading
    window.addEventListener('load', function() {
        setTimeout(function() {
            preloader.style.opacity = '0';
            preloader.style.visibility = 'hidden';
        }, 1000);
    });
});

// Initialize skill sliders for proper infinite scrolling
function initSkillSliders() {
    const sliders = document.querySelectorAll('.skills-slider');

    sliders.forEach(slider => {
        const track = slider.querySelector('.skills-track');
        const direction = slider.getAttribute('data-direction');

        // Calculate the width of the first set of cards
        const cards = track.querySelectorAll('.skill-card');
        const firstSetCount = cards.length / 2;
        const firstSetWidth = Array.from(cards)
            .slice(0, firstSetCount)
            .reduce((width, card) => {
                return width + card.offsetWidth + parseInt(getComputedStyle(card).marginLeft) + 
                    parseInt(getComputedStyle(card).marginRight);
            }, 0);

        // Set the animation keyframes dynamically
        const keyframes = direction === 'left' 
            ? `@keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-${firstSetWidth}px); } }`
            : `@keyframes scroll-right { 0% { transform: translateX(-${firstSetWidth}px); } 100% { transform: translateX(0); } }`;

        // Add the keyframes to the document
        const styleSheet = document.createElement('style');
        styleSheet.textContent = keyframes;
        document.head.appendChild(styleSheet);
    });
}

// Call this after the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for images to load before initializing sliders
    window.addEventListener('load', initSkillSliders);
});

// Handle interest card flipping
document.addEventListener('DOMContentLoaded', function() {
    // Initialize interest cards
    function initInterestCards() {
        const interestCards = document.querySelectorAll('.interest-card');
    
        interestCards.forEach(card => {
            card.addEventListener('click', function() {
                // Remove the flipped class from all other cards
                interestCards.forEach(otherCard => {
                    if (otherCard !== card) {
                        otherCard.classList.remove('flipped');
                    }
                });
    
                // Toggle the flipped class on the clicked card
                this.classList.toggle('flipped');
            });
        });
    }
    

    initInterestCards();

    // Animate music visualizers
    const musicCards = document.querySelectorAll('.music-items .interest-item');

    musicCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const visualizer = this.querySelector('.music-visualizer');

            if (visualizer) {
                visualizer.querySelectorAll('span').forEach(bar => {
                    // Reset animation
                    bar.style.animation = 'none';
                    setTimeout(() => {
                        bar.style.animation = '';
                    }, 10);
                });
            }
        });
    });

    // Add parallax effect to interest cards
    const interestsSection = document.getElementById('interests');

    interestsSection.addEventListener('mousemove', function(e) {
        // Only apply parallax to cards that are NOT flipped
        const cards = document.querySelectorAll('.interest-card:not(.flipped) .interest-card-inner');

        cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const cardCenterX = cardRect.left + cardRect.width / 2;
            const cardCenterY = cardRect.top + cardRect.height / 2;

            const offsetX = (e.clientX - cardCenterX) / 30;
            const offsetY = (e.clientY - cardCenterY) / 30;

            card.style.transform = `rotateY(${offsetX}deg) rotateX(${-offsetY}deg)`;
        });
    });

    interestsSection.addEventListener('mouseleave', function() {
        // Reset transform for non-flipped cards only
        const cards = document.querySelectorAll('.interest-card:not(.flipped) .interest-card-inner');

        cards.forEach(card => {
            card.style.transform = 'rotateY(0deg) rotateX(0deg)';
        });
    });
});

function initMusicCard() {
    const musicCard = document.querySelector('.music-card-back');
    if (!musicCard) return;

    const visualizerBars = musicCard.querySelectorAll('.visualizer-bar');
    const playButton = musicCard.querySelector('.spotify-play-button');
    const pauseButton = musicCard.querySelector('.fa-pause');
    const albumCover = musicCard.querySelector('.spotify-album img');

    // Function to randomize visualizer heights
    function randomizeVisualizer() {
        visualizerBars.forEach(bar => {
            // Generate random height between 10% and 90%
            const randomHeight = Math.floor(Math.random() * 80) + 10;
            bar.style.height = `${randomHeight}%`;
        });
    }

    // Initial randomization
    randomizeVisualizer();

    // Set interval for continuous randomization
    let visualizerInterval;

    // Toggle play/pause
    let isPlaying = false;

    function togglePlay() {
        isPlaying = !isPlaying;

        if (isPlaying) {
            // Start visualizer animation
            visualizerInterval = setInterval(randomizeVisualizer, 100);

            // Update UI to show playing state
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
            pauseButton.classList.remove('fa-pause');
            pauseButton.classList.add('fa-play');

            // Add pulsing effect to album
            albumCover.style.animation = 'pulse 1.5s infinite ease-in-out';
        } else {
            // Stop visualizer animation
            clearInterval(visualizerInterval);

            // Reset visualizer bars
            visualizerBars.forEach(bar => {
                bar.style.height = '10%';
            });

            // Update UI to show paused state
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            pauseButton.classList.remove('fa-play');
            pauseButton.classList.add('fa-pause');

            // Remove pulsing effect
            albumCover.style.animation = 'none';
        }
    }

    // Event listeners
    playButton.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePlay();
    });

    pauseButton.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePlay();
    });

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.05);
            }
        }
    `;
    document.head.appendChild(style);

    // Clean up when card is flipped back
    const interestCard = musicCard.closest('.interest-card');
    interestCard.addEventListener('click', function() {
        if (!this.classList.contains('flipped') && isPlaying) {
            togglePlay();
        }
    });
}

// Initialize music card when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initMusicCard();
});

// Function to update Altbot follower count
function updateAltbotFollowerCount() {
    // Create a proxy URL to avoid CORS issues
    // You can use a service like allorigins.win or cors-anywhere
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const badgeUrl = 'https://img.shields.io/mastodon/follow/113183205946060973?domain=fuzzies.wtf&style=social';
    const encodedBadgeUrl = encodeURIComponent(badgeUrl);

    fetch(proxyUrl + encodedBadgeUrl)
        .then(response => response.text())
        .then(svgText => {
            // Parse the SVG to extract the follower count
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');

            // Find the text element with the follower count
            const textElements = svgDoc.querySelectorAll('text');
            let followerCount = null;

            // Look through all text elements to find the one with the count
            textElements.forEach(element => {
                const content = element.textContent.trim();
                // The follower count typically has "k" for thousands
                if (content.includes('k') || /^\d+$/.test(content)) {
                    followerCount = content;
                }
            });

            if (followerCount) {
                // Update the project stat element with the new count
                const projectCards = document.querySelectorAll('.project-card');
                projectCards.forEach(card => {
                    const titleElement = card.querySelector('h3');
                    if (titleElement && titleElement.textContent.trim() === 'Altbot') {
                        const statElement = card.querySelector('.project-stat:first-child');
                        if (statElement) {
                            statElement.innerHTML = `<i class="fas fa-user-group"></i> ${followerCount}`;
                            console.log('Updated Altbot follower count to:', followerCount);
                        }
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error fetching Altbot follower count:', error);
        });
}

// Update the follower count when the page loads
document.addEventListener('DOMContentLoaded', function() {
    updateAltbotFollowerCount();

    // Optionally, update the count periodically (every hour)
    setInterval(updateAltbotFollowerCount, 3600000);
});

// Terminal Hacker Easter Egg
function createTerminalEasterEgg() {
    const micr0Card = document.querySelector('.micr0Card');
    const takeThereLink = document.querySelector('.take-there-link');

    // Unlink the "Take me there!" link
    takeThereLink.removeAttribute('href');

    let isTerminalActive = false;
    let terminalContainer;

    takeThereLink.addEventListener('click', function(e) {
        toggleTerminal();
    });

    function toggleTerminal() {
        if (isTerminalActive) {
            // Remove terminal
            terminalContainer.remove();
            micr0Card.classList.remove('terminal-active');
            isTerminalActive = false;
        } else {
            // Create terminal
            isTerminalActive = true;
            micr0Card.classList.add('terminal-active');

            // Save original content
            const originalContent = micr0Card.querySelector('.project-content').innerHTML;

            // Create terminal container
            terminalContainer = document.createElement('div');
            terminalContainer.classList.add('terminal-container');

            // Terminal header
            const terminalHeader = document.createElement('div');
            terminalHeader.classList.add('terminal-header');
            terminalHeader.innerHTML = `
                <div class="terminal-buttons">
                    <span class="terminal-close"></span>
                    <span class="terminal-minimize"></span>
                    <span class="terminal-maximize"></span>
                </div>
                <div class="terminal-title">micr0@dev:~</div>
            `;

            // Terminal content
            const terminalContent = document.createElement('div');
            terminalContent.classList.add('terminal-content');

            terminalContainer.appendChild(terminalHeader);
            terminalContainer.appendChild(terminalContent);

            // Replace card content with terminal
            micr0Card.querySelector('.project-content').innerHTML = '';
            micr0Card.querySelector('.project-content').appendChild(terminalContainer);

            // Add close button handler
            terminalHeader.querySelector('.terminal-close').addEventListener('click', function() {
                // Restore original content
                micr0Card.querySelector('.project-content').innerHTML = originalContent;
                micr0Card.classList.remove('terminal-active');
                isTerminalActive = false;
            });

            // Start typing animation
            const commands = [
                { text: "micr0@dev:~ $ ls -la", delay: 100 },
                { text: "total 42drwxr-xr-x  5 micr0 dev  4096 Feb 27 2025 .drwxr-xr-x 22 micr0 dev  4096 Feb 27 2025 ..-rw-r--r--  1 micr0 dev   220 Feb 27 2025 .bash_logout-rw-r--r--  1 micr0 dev  3771 Feb 27 2025 .bashrcdrwx------  2 micr0 dev  4096 Feb 27 2025 .cache-rw-r--r--  1 micr0 dev   807 Feb 27 2025 .profiledrwxr-xr-x  2 micr0 dev  4096 Feb 27 2025 projectsdrwxr-xr-x  2 micr0 dev  4096 Feb 27 2025 secrets", delay: 500 },
                { text: "micr0@dev:~ $ cd secrets", delay: 100 },
                { text: "micr0@dev:~/secrets $ ls -la", delay: 100 },
                { text: "total 16drwxr-xr-x 2 micr0 dev 4096 Feb 27 2025 .drwxr-xr-x 5 micr0 dev 4096 Feb 27 2025 ..-rw-r--r-- 1 micr0 dev  256 Feb 27 2025 easter_egg.txt", delay: 300 },
                { text: "micr0@dev:~/secrets $ cat easter_egg.txt", delay: 100 },
                { text: "Congratulations! You've found the secret terminal easter egg! Press any key to exit...", delay: 200 }
            ];

            let commandIndex = 0;
            let charIndex = 0;

            function typeNextCommand() {
                if (commandIndex >= commands.length) {
                    // Add event listener to exit on key press after all commands
                    document.addEventListener('keydown', exitTerminal, { once: true });
                    return;
                }

                const command = commands[commandIndex];

                if (charIndex === 0) {
                    // Create new line for command
                    const commandLine = document.createElement('div');
                    commandLine.classList.add('command-line');
                    terminalContent.appendChild(commandLine);
                }

                const currentLine = terminalContent.querySelector('.command-line:last-child');

                if (charIndex < command.text.length) {
                    // Type next character
                    if (command.text.substring(charIndex, charIndex + 4) === "") {
                        currentLine.innerHTML += "";
                        charIndex += 4;
                    } else {
                        currentLine.innerHTML += command.text.charAt(charIndex);
                        charIndex++;
                    }

                    // Scroll to bottom
                    terminalContent.scrollTop = terminalContent.scrollHeight;

                    // Schedule next character
                    setTimeout(typeNextCommand, 10);
                } else {
                    // Move to next command
                    charIndex = 0;
                    commandIndex++;

                    // Add response line
                    if (commandIndex < commands.length) {
                        setTimeout(typeNextCommand, command.delay);
                    } else {
                        // All commands completed
                        document.addEventListener('keydown', exitTerminal, { once: true });
                    }
                }
            }

            function exitTerminal() {
                // Restore original content
                micr0Card.querySelector('.project-content').innerHTML = originalContent;
                micr0Card.classList.remove('terminal-active');
                isTerminalActive = false;
            }

            // Start typing
            setTimeout(typeNextCommand, 500);
        }
    }
}

// Initialize terminal easter egg
document.addEventListener('DOMContentLoaded', function() {
    createTerminalEasterEgg();
});