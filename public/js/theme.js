(function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    window.toggleTheme = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        updateThemeIcons();
    };

    function updateThemeIcons() {
        const icons = document.querySelectorAll('.theme-toggle i');
        const currentTheme = document.documentElement.getAttribute('data-theme');
        
        icons.forEach(icon => {
            if (currentTheme === 'dark') {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        });
    }

    // Initialize icons on load
    document.addEventListener('DOMContentLoaded', updateThemeIcons);
})();
