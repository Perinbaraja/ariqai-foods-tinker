document.addEventListener('DOMContentLoaded', () => {
  const cartContainer = document.getElementById('RequestQuoteCartContainer');
  const form = document.querySelector('.request-quote-page__form');
  const hiddenProductsInput = document.getElementById('RequestQuoteHiddenProducts');
  
  if (!cartContainer) return;

  // Fetch Cart Data
  fetch(window.Shopify.routes.root + 'cart.js')
    .then((response) => response.json())
    .then((cart) => {
      renderCartItems(cart);
    })
    .catch((error) => {
      console.error('Error fetching cart:', error);
      cartContainer.innerHTML = '<p class="request-quote-page__error">Failed to load cart items. Please refresh the page.</p>';
    });

  function renderCartItems(cart) {
    if (cart.item_count === 0) {
      cartContainer.innerHTML = `
        <div class="request-quote-page__empty-cart">
          <p>Your cart is empty.</p>
          <a href="/collections/all" class="button">Continue Shopping</a>
        </div>
      `;
      // Optionally disable the submit button if cart is empty
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Cart is empty';
      }
      return;
    }

    let itemsHtml = '';
    let productsText = 'Products:\n\n';

    cart.items.forEach((item, index) => {
      // Build HTML
      const imageHtml = item.image 
        ? `<img src="${item.image}" alt="${item.product_title}" loading="lazy">`
        : '';
        
      const variantHtml = item.variant_title ? `<span class="request-quote-item__variant">Variant: ${item.variant_title}</span>` : '';
      const skuHtml = item.sku ? `<span class="request-quote-item__sku">SKU: ${item.sku}</span>` : '';

      itemsHtml += `
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

      // Build Text for Form
      productsText += `${index + 1}. ${item.product_title}`;
      if (item.variant_title) {
        productsText += ` - ${item.variant_title}`;
      }
      if (item.sku) {
        productsText += ` (SKU: ${item.sku})`;
      }
      productsText += ` × ${item.quantity}\n`;
    });

    cartContainer.innerHTML = itemsHtml;
    
    if (hiddenProductsInput) {
      hiddenProductsInput.value = productsText;
    }
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      // Intercept to build the final body field
      const bodyInput = document.getElementById('RequestQuoteForm-ContactBody');
      const notesInput = document.getElementById('RequestQuoteForm-body');
      const productsText = hiddenProductsInput.value || 'No products found.';
      const notesText = notesInput ? notesInput.value : '';

      bodyInput.value = `${productsText}\nAdditional Notes:\n${notesText || 'None'}`;
    });
  }
});
