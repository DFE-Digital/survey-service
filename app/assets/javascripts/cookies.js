function CookieBanner(module) {
  this.module = module;
  this.banner = module.querySelector('.js-cookie-banner');
  this.confirmation = module.querySelector('.js-cookie-banner-confirmation');
  this.acceptButton = module.querySelector('.js-cookie-banner-accept');
  this.rejectButton = module.querySelector('.js-cookie-banner-reject');
  this.hideButton = module.querySelector('.js-cookie-banner-hide');
}

CookieBanner.prototype.init = function() {
  if (!this.module) {
    return;
  }

  this.setupCookieEventListeners();
  this.showBannerIfNeeded();
};

CookieBanner.prototype.setupCookieEventListeners = function() {
  if (this.acceptButton) {
    this.acceptButton.form.addEventListener('submit', (e) => {
      if (e.submitter === this.acceptButton) {
        this.setCookieConsent(true);
      }
    });
  }
  
  if (this.rejectButton) {
    this.rejectButton.form.addEventListener('submit', (e) => {
      if (e.submitter === this.rejectButton) {
        this.setCookieConsent(false);
      }
    });
  }
  
  if (this.hideButton) {
    this.hideButton.form.addEventListener('submit', (e) => {
      if (e.submitter === this.hideButton) {
        this.hideConfirmation();
      }
    });
  }
};

CookieBanner.prototype.showBannerIfNeeded = function() {
  const consent = this.getConsentCookie();
  if (!consent) {
    this.showBanner();
  }
};

CookieBanner.prototype.showBanner = function() {
  if (this.banner) {
    this.banner.removeAttribute('hidden');
  }
  if (this.confirmation) {
    this.confirmation.setAttribute('hidden', 'hidden');
  }
};

CookieBanner.prototype.showConfirmation = function(accepted) {
  if (this.banner) {
    this.banner.setAttribute('hidden', 'hidden');
  }
  if (this.confirmation) {
    this.confirmation.removeAttribute('hidden');
  }
};

CookieBanner.prototype.hideConfirmation = function() {
  if (this.confirmation) {
    this.confirmation.setAttribute('hidden', 'hidden');
  }
};

CookieBanner.prototype.setCookieConsent = function(accepted) {
  this.setConsentCookie(accepted);
  this.showConfirmation(accepted);
  if (accepted) {
    this.initializeGoogleAnalytics();
  } else {
    this.removeGoogleAnalyticsCookies();
  }
};

CookieBanner.prototype.setConsentCookie = function(accepted) {
  const cookiePolicy = {
    analytics: accepted,
    essential: true
  };
  
  document.cookie = 'cookies_policy=' + JSON.stringify(cookiePolicy) + '; path=/; max-age=31557600';
};

CookieBanner.prototype.getConsentCookie = function() {
  const cookies = document.cookie.split(';');
  const cookiesPolicyStr = cookies.find(c => c.trim().startsWith('cookies_policy='));
  
  if (!cookiesPolicyStr) {
    return null;
  }

  try {
    return JSON.parse(cookiesPolicyStr.split('=')[1]);
  } catch (e) {
    return null;
  }
};

CookieBanner.prototype.removeGoogleAnalyticsCookies = function() {
  // List of Google Analytics cookies to remove
  const gaCookies = ['_ga', '_gid', '_gat', '_ga_'];
  
  // Get all cookies
  const cookies = document.cookie.split(';');
  
  // For each cookie, if it's a GA cookie, remove it
  cookies.forEach(cookie => {
    const cookieName = cookie.split('=')[0].trim();
    
    // Check if this is a GA cookie
    const isGACookie = gaCookies.some(gaName => 
      cookieName === gaName || cookieName.startsWith(gaName)
    );
    
    if (isGACookie) {
      // Remove the cookie by setting its expiry to past date
      document.cookie = cookieName + '=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Also try removing it from potential subdomains
      const domain = window.location.hostname;
      document.cookie = cookieName + '=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=' + domain + ';';
      document.cookie = cookieName + '=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=.' + domain + ';';
    }
  });
};

CookieBanner.prototype.initializeGoogleAnalytics = function() {
  // Add your Google Analytics initialization code here
};

// Initialize all cookie banners
document.addEventListener('DOMContentLoaded', function() {
  const cookieBanners = document.querySelectorAll('[data-module="cookie-banner"]');
  cookieBanners.forEach(banner => {
    new CookieBanner(banner).init();
  });
}); 