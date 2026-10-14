const isMobile = (() => {
    // Check if the new API is supported
    if (navigator.userAgentData) {
      return navigator.userAgentData.mobile;
    }

    return /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
  })();
