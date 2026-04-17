document.addEventListener('DOMContentLoaded', () => {
  const cartContainer = document.getElementById('RequestQuoteCartContainer');
  const form = document.querySelector('.request-quote-page__form');
  const successMessage = document.querySelector('.request-quote-page__success');
  const errorMessage = document.querySelector('.request-quote-page__error');
  const hiddenProductsInput = document.getElementById('RequestQuoteHiddenProducts');
  const contactBodyInput = document.getElementById('RequestQuoteForm-ContactBody');
  const submitButton = form?.querySelector('button[type="submit"]');

  let cartItems = [];

  function syncThemeCartCount(itemCount = 0) {
    const normalizedCount = Math.max(0, Number(itemCount) || 0);
    const cartIcon = document.querySelector('cart-icon');
    const cartBubble = cartIcon?.querySelector('.cart-bubble');
    const cartBubbleCount = cartIcon?.querySelector('[data-testid="cart-bubble"]');

    if (cartBubble && cartBubbleCount) {
      cartBubble.classList.toggle('visually-hidden', normalizedCount === 0);
      cartBubbleCount.classList.toggle('hidden', normalizedCount === 0);
      cartBubbleCount.textContent = normalizedCount > 0 && normalizedCount < 100 ? String(normalizedCount) : '';
      cartIcon.classList.toggle('header-actions__cart-icon--has-cart', normalizedCount > 0);
    }

    try {
      sessionStorage.setItem(
        'cart-count',
        JSON.stringify({
          value: String(normalizedCount < 100 ? normalizedCount : ''),
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.warn('Unable to persist cart count in session storage:', error);
    }

    const cartUpdateEvent = new Event('cart:update', { bubbles: true });
    cartUpdateEvent.detail = {
      resource: {
        items: normalizedCount === 0 ? [] : cartItems,
        item_count: normalizedCount,
      },
      sourceId: 'request-quote-page',
      data: {
        source: 'request-quote-page',
        itemCount: normalizedCount,
      },
    };
    document.dispatchEvent(cartUpdateEvent);
  }

  function setMessageVisibility(showSuccess = false, showError = false) {
    if (successMessage) successMessage.style.display = showSuccess ? 'flex' : 'none';
    if (errorMessage) errorMessage.style.display = showError ? 'flex' : 'none';
  }

  function showSuccess() {
    setMessageVisibility(true, false);
  }

  function showError() {
    setMessageVisibility(false, true);
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function renderCartItems(items) {
    if (!cartContainer) return;

    if (!items || items.length === 0) {
      cartContainer.innerHTML = `
        <div class="request-quote-page__empty-cart">
          <p>Your cart is empty.</p>
          <a href="/collections/all" class="button">Continue Shopping</a>
        </div>
      `;
      const submitBtn = form?.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Cart is empty';
      }
      return;
    }

    const itemsHtml = items.map((item) => {
      const imageHtml = item.image ? `<img src="${item.image}" alt="${item.product_title}" loading="lazy">` : '';
      const variantHtml = item.variant_title ? `<span class="request-quote-item__variant">Variant: ${item.variant_title}</span>` : '';
      const skuHtml = item.sku ? `<span class="request-quote-item__sku">SKU: ${item.sku}</span>` : '';

      return `
        <div class="request-quote-item">
          <div class="request-quote-item__image">${imageHtml}</div>
          <div class="request-quote-item__details">
            <span class="request-quote-item__title">${item.product_title}</span>
            ${variantHtml}
            ${skuHtml}
            <span class="request-quote-item__quantity">Qty: ${item.quantity}</span>
          </div>
        </div>
      `;
    }).join('');

    cartContainer.innerHTML = itemsHtml;
  }

  async function fetchCart() {
    try {
      const response = await fetch(window.Shopify.routes.root + 'cart.js');
      const cart = await response.json();
      cartItems = cart.items || [];
      renderCartItems(cartItems);
      syncThemeCartCount(cart.item_count ?? cartItems.reduce((total, item) => total + (item.quantity || 0), 0));
    } catch (error) {
      console.error('Error fetching cart:', error);
      if (cartContainer) {
        cartContainer.innerHTML = '<p class="request-quote-page__error">Failed to load cart items. Please refresh the page.</p>';
      }
    }
  }

  function isLikelyHtmlResponse(responseText, contentType) {
    if ((contentType || '').includes('text/html')) return true;
    return /^\s*<!doctype html/i.test(responseText || '') || /^\s*<html/i.test(responseText || '');
  }

  async function postQuoteRequest(endpoint, payload, format = 'json') {
    const requestOptions = {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
      },
    };

    if (format === 'form') {
      const formData = new URLSearchParams();
      formData.append('customerName', payload.customerName || '');
      formData.append('customerEmail', payload.customerEmail || '');
      formData.append('customerPhone', payload.customerPhone || '');
      formData.append('company', payload.company || '');
      formData.append('notes', payload.notes || '');
      formData.append('products', JSON.stringify(payload.products || []));
      formData.append('payload', JSON.stringify(payload));
      requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
      requestOptions.body = formData.toString();
    } else {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(endpoint, requestOptions);
    const responseText = await response.text();
    const contentType = response.headers.get('Content-Type') || '';

    if (!response.ok) {
      let message = `Failed to send quote request (${response.status})`;
      try {
        const data = JSON.parse(responseText || '{}');
        if (data?.message) message = data.message;
      } catch (error) {
        if (responseText?.trim()) {
          message = responseText.trim();
        }
      }
      throw new Error(message);
    }

    if (!responseText) return null;

    if (isLikelyHtmlResponse(responseText, contentType)) {
      throw new Error('Received HTML instead of app response');
    }

    try {
      return JSON.parse(responseText);
    } catch (error) {
      return { ok: true, raw: responseText };
    }
  }

  async function sendQuoteRequest(payload) {
    const endpoint = '/apps/quote-mailer';
    const attempts = [
      { format: 'json', delay: 0 },
      { format: 'form', delay: 250 },
      { format: 'form', delay: 800 },
    ];
    let lastError;

    for (const attempt of attempts) {
      if (attempt.delay) {
        await sleep(attempt.delay);
      }

      try {
        return await postQuoteRequest(endpoint, payload, attempt.format);
      } catch (error) {
        lastError = error;
        console.warn(`Quote request attempt failed (${attempt.format})`, error);
      }
    }

    throw lastError || new Error('Failed to send quote request');
  }

  async function clearCart() {
    const clearUrl = window.Shopify?.routes?.root ? window.Shopify.routes.root + 'cart/clear.js' : '/cart/clear.js';

    try {
      const response = await fetch(clearUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        console.warn('Failed to clear cart after quote request:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('Failed to clear cart after quote request:', error);
    }
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const customerName = document.getElementById('RequestQuoteForm-name')?.value.trim();
      const customerEmail = document.getElementById('RequestQuoteForm-email')?.value.trim();
      const customerPhone = document.getElementById('RequestQuoteForm-phone')?.value.trim();
      const company = document.getElementById('RequestQuoteForm-company')?.value.trim();
      const notes = document.getElementById('RequestQuoteForm-body')?.value.trim();

      if (!form.reportValidity()) {
        showError();
        event.preventDefault();
        return;
      }

      const productsPayload = cartItems.map((item) => ({
        name: item.product_title,
        variant: item.id || '',
        sku: item.sku || '',
        quantity: item.quantity,
        image: item.image || '',
      }));

      if (hiddenProductsInput) {
        hiddenProductsInput.value = productsPayload
          .map(
            (item) =>
              `${item.name} (${item.quantity})${item.sku ? ` - ${item.sku}` : ''}${item.image ? ` - Image: ${item.image}` : ''}`
          )
          .join('\n');
      }

      if (contactBodyInput) {
        contactBodyInput.value = `Products:\n${productsPayload
          .map(
            (item) =>
              `${item.name} x ${item.quantity}${item.sku ? ` (SKU: ${item.sku})` : ''}${item.image ? `\nImage: ${item.image}` : ''}`
          )
          .join('\n')}\n\nNotes:\n${notes || 'N/A'}`;
      }

      if (!customerName || !customerEmail || !customerPhone || !productsPayload.length) {
        showError();
        event.preventDefault();
        return;
      }

      const payload = {
        customerName,
        customerEmail,
        customerPhone,
        company,
        notes,
        products: productsPayload,
      };

      try {
        setMessageVisibility(false, false);

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Submitting...';
        }

        await sendQuoteRequest(payload);
        showSuccess();
        form.reset();
        await clearCart();
        cartItems = [];
        syncThemeCartCount(0);
        renderCartItems(cartItems);
        await fetchCart();
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Quote submitted';
        }
      } catch (error) {
        console.error('Quote request failed', error);
        showError();
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Submit Quote Request';
        }
      }
    });
  }

  fetchCart();
});
