const SELECTORS = {
  trigger: '[data-request-quote-trigger]',
  close: '[data-request-quote-close]',
};

const dialog = document.querySelector('#request-quote-modal');

if (dialog) {
  const summary = dialog.querySelector('#RequestQuoteSummary');
  const body = dialog.querySelector('#RequestQuoteBody');
  const source = dialog.querySelector('#RequestQuoteSource');
  const productUrl = dialog.querySelector('#RequestQuoteProductUrl');

  const buildBody = (details, sourceLabel) => {
    return [
      'Quote request details',
      '',
      details,
      '',
      `Source: ${sourceLabel}`,
      `Page: ${window.location.href}`,
      '',
      'Additional requirements:',
      '',
    ].join('\n');
  };

  document.addEventListener('click', (event) => {
    const closeButton = event.target.closest(SELECTORS.close);
    if (closeButton) {
      dialog.close();
      return;
    }

    const trigger = event.target.closest(SELECTORS.trigger);
    if (!trigger) return;

    event.preventDefault();

    let details = trigger.dataset.quoteDetails || 'Product details will be shared after form submission.';
    const sourceLabel = trigger.dataset.quoteSource || 'storefront';
    const targetUrl = trigger.dataset.quoteUrl || window.location.href;
    const closestForm = trigger.closest('form');

    if (closestForm && trigger.dataset.quoteProductTitle) {
      const quantityInput = closestForm.querySelector('[name="quantity"]');
      const variantInput = closestForm.querySelector('[name="id"]');
      const quantity = quantityInput?.value || '1';
      const variantId = variantInput?.value || 'Not selected';

      details = [
        `Product: ${trigger.dataset.quoteProductTitle}`,
        `Quantity: ${quantity}`,
        `Variant ID: ${variantId}`,
        `URL: ${targetUrl}`,
      ].join('\n');
    }

    summary.textContent = details;
    body.value = buildBody(details, sourceLabel);
    source.value = sourceLabel;
    productUrl.value = targetUrl;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  });

  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const isInDialog =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      dialog.close();
    }
  });
}
