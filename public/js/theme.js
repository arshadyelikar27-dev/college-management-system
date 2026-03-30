(function() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);

    window.toggleTheme = function() {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcons();

        document.body.style.transition = 'background 0.4s ease';
        setTimeout(() => { document.body.style.transition = ''; }, 500);
    };

    function updateThemeIcons() {
        const cur = document.documentElement.getAttribute('data-theme');
        document.querySelectorAll('.theme-toggle i').forEach(ic => {
            ic.className = cur === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateThemeIcons();

        const spotlight = document.createElement('div');
        spotlight.className = 'cursor-spotlight';
        document.body.appendChild(spotlight);

        document.addEventListener('mousemove', (e) => {
            spotlight.style.left = e.clientX + 'px';
            spotlight.style.top = e.clientY + 'px';
        });

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                }
            });
        }, { threshold: 0.08 });

        document.querySelectorAll('.reveal, .reveal-scale').forEach(el => {
            el.style.animationPlayState = 'paused';
            revealObserver.observe(el);
        });
    });
})();
