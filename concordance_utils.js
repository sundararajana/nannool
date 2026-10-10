
  // Helper function to turn nurpa text string into clickable concordance word links
  function concordanceLinkedNurpa(isMobile, text) {
    // Split the text by spaces (or whitespace)
    const words = text.split(/\s+/);

    // Map each word to an HTML anchor tag pointing to your concordance page
    return words.map(word => {
      // Optional: strip trailing punctuation (like commas, periods, semicolons)
      // if you want the link to target just the clean word lemma/form.
      const cleanWord = word.replace(/^[^\w\u0080-\uFFFF]+|[^\w\u0080-\uFFFF]+$/g, '');
      const encodedWord = encodeURIComponent(cleanWord);

      // If it's a valid word, wrap it in a link; otherwise, just return the raw token/punctuation
      if (!cleanWord) return word;

      const target = isMobile ? "_blank" : "NannoolConcordancePage";

      return `<a href="concordance.html?word=${encodedWord}"
        style="color: var(--primary); text-decoration:none"
        target="${target}" class="concordance-word-link">${word}</a>`;
    }).join(' ');
  }