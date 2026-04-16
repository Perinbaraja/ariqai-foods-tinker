document.addEventListener('DOMContentLoaded', () => {
  const cartContainer = document.getElementById('RequestQuoteCartContainer');
  const form = document.querySelector('.request-quote-page__form');
  const successMessage = document.querySelector('.request-quote-page__success');
  const errorMessage = document.querySelector('.request-quote-page__error');

  let cartItems = [];

  function showSuccess() {
    if (successMessage) successMessage.style.display = 'block';
    if (errorMessage) errorMessage.style.display = 'none';
  }

  function showError() {
    if (successMessage) successMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'block';
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

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'Failed to send quote request');
    }

    return response.json();
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const customerName = document.getElementById('RequestQuoteForm-name')?.value.trim();
      const customerEmail = document.getElementById('RequestQuoteForm-email')?.value.trim();
      const customerPhone = document.getElementById('RequestQuoteForm-phone')?.value.trim();
      const company = document.getElementById('RequestQuoteForm-company')?.value.trim();
      const notes = document.getElementById('RequestQuoteForm-body')?.value.trim();

      const payload = {
        customerName,
        customerEmail,
        customerPhone,
        company,
        notes,
        products: cartItems.map((item) => ({
          name: item.product_title,
          variant: item.variant_title || '',
          sku: item.sku || '',
          quantity: item.quantity,
        })),
      };

      try {
        await sendQuoteRequest(payload);
        showSuccess();
        form.reset();
      } catch (error) {
        console.error('Quote request failed', error);
        showError();
      }
    });
  }

  fetchCart();
});
