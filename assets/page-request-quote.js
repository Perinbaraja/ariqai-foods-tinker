document.addEventListener('DOMContentLoaded', () => {
  const cartContainer = document.getElementById('RequestQuoteCartContainer');
  const form = document.querySelector('.request-quote-page__form');
  const successMessage = document.querySelector('.request-quote-page__success');
  const errorMessage = document.querySelector('.request-quote-page__error');
  const hiddenProductsInput = document.getElementById('RequestQuoteHiddenProducts');
  const contactBodyInput = document.getElementById('RequestQuoteForm-ContactBody');
  const submitButton = form?.querySelector('button[type="submit"]');

  let cartItems = [];

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
      console.log('Cart items:', cartItems);
      renderCartItems(cartItems);
    } catch (error) {
      console.error('Error fetching cart:', error);
      if (cartContainer) {
        cartContainer.innerHTML = '<p class="request-quote-page__error">Failed to load cart items. Please refresh the page.</p>';
      }
    }
  }

  async function sendQuoteRequest(payload) {
    const endpoint = '/apps/quote-mailer';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      let message = 'Failed to send quote request';
      try {
        const data = JSON.parse(responseText || '{}');
        if (data?.message) message = data.message;
      } catch (error) {
        console.warn('Quote request error response was not JSON:', error);
      }
      throw new Error(message);
    }

    if (!responseText) {
      return null;
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(responseText);
      } catch (error) {
        console.warn('Received non-JSON body for successful quote request:', error);
        return null;
      }
    }

    return null;
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

      const productsPayload = cartItems.map((item) => ({
        name: item.product_title,
        variant: item.id || '',
        sku: item.sku || '',
        quantity: item.quantity,
      }));

      if (hiddenProductsInput) {
        hiddenProductsInput.value = productsPayload
          .map((item) => `${item.name} (${item.quantity})${item.sku ? ` - ${item.sku}` : ''}`)
          .join('\n');
      }

      if (contactBodyInput) {
        contactBodyInput.value = `Products:\n${productsPayload
          .map((item) => `${item.name} x ${item.quantity}${item.sku ? ` (SKU: ${item.sku})` : ''}`)
          .join('\n')}\n\nNotes:\n${notes || 'N/A'}`;
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
        await sendQuoteRequest(payload);
        showSuccess();
        form.reset();
        await clearCart();
        cartItems = [];
        renderCartItems(cartItems);
        await fetchCart();
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Quote submitted';
        }
      } catch (error) {
        console.error('Quote request failed', error);
        showError();
      }
    });
  }

  fetchCart();
});
