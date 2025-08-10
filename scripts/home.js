// Hero animations and interactions
document.addEventListener('DOMContentLoaded', function() {
    // Parallax effect for floating shapes
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelectorAll('.shape');
        
        parallax.forEach(shape => {
            const speed = shape.dataset.speed || 0.5;
            const yPos = -(scrolled * speed);
            shape.style.transform = `translateY(${yPos}px)`;
        });
    });
    
    // Button hover effects
    const buttons = document.querySelectorAll('.btn-hero-primary, .btn-cta-primary');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Stats counter animation
    const stats = document.querySelectorAll('.stat-number');
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const statsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateNumber(entry.target);
                statsObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    stats.forEach(stat => {
        statsObserver.observe(stat);
    });
    
    function animateNumber(element) {
        const text = element.textContent;
        const number = parseInt(text.replace(/[^\d]/g, ''));
        const suffix = text.replace(/[\d]/g, '');
        
        let current = 0;
        const increment = number / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= number) {
                current = number;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current) + suffix;
        }, 30);
    }
});
