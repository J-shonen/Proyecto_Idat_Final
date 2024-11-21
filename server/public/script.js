let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Inicializar Stripe
const stripe = Stripe('pk_test_51QFQJfG7MXI7zJaUBC61yF0wwzqnqvqCty7tIZdJd1LpL1b0sC4HU8LTSlF0aDNWY7oiOvnaEvJ2eqpAPwnKw7Ec00oI1JGJt6'); // Reemplaza con tu clave pública
const elements = stripe.elements();
const card = elements.create('card');
card.mount('#card-element');

// Lista de cupones válidos
const validCoupons = {
    "DESCUENTO10": 0.10, // 10% de descuento
    "DESCUENTO20": 0.20  // 20% de descuento
};
let appliedCoupon = null; // Cupón aplicado

// Mostrar productos en el DOM
function displayProducts(products) {
    const productList = $('#product-list');
    productList.empty();

    products.forEach(product => {
        const productItem = `
            <div class="product">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <p>Precio: $${product.price}</p>
                <button onclick="addToCart('${product._id}', '${product.name}', ${product.price})">Agregar al Carrito</button>
            </div>
        `;
        productList.append(productItem);
    });
}

// Agregar productos al carrito
window.addToCart = function (id, name, price) {
    const existingProductIndex = cart.findIndex(item => item.id === id);

    if (existingProductIndex !== -1) {
        cart[existingProductIndex].quantity += 1; // Incrementar cantidad
    } else {
        cart.push({ id, name, price: parseFloat(price), quantity: 1 });
    }

    updateCartInLocalStorage();
    displayCart();
};

// Mostrar el carrito
function displayCart() {
    const cartDiv = $('#cart-items');
    const cartTotal = $('#cart-total');
    const couponMessage = $('#coupon-message');
    cartDiv.empty();
    let total = 0;

    if (cart.length === 0) {
        cartDiv.append('<p>Tu carrito está vacío.</p>');
        cartTotal.text('Total: $0.00');
        $('#checkout-btn').hide();
        return;
    }

    cart.forEach(item => {
        total += item.price * item.quantity;
        cartDiv.append(`
            <li>${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</li>
        `);
    });

    // Aplicar descuento si hay un cupón
    if (appliedCoupon) {
        const discount = total * appliedCoupon;
        total -= discount;
        cartDiv.append(`<p>Descuento aplicado: -$${discount.toFixed(2)}</p>`);
    }

    cartTotal.text(`Total: $${total.toFixed(2)}`);
    $('#checkout-btn').show();
    couponMessage.text('');
}

// Aplicar cupón de descuento
window.applyCoupon = function () {
    const couponCode = $('#coupon-code').val().trim();
    const couponMessage = $('#coupon-message');

    if (validCoupons[couponCode]) {
        appliedCoupon = validCoupons[couponCode];
        couponMessage.text(`Cupón aplicado: ${couponCode} (${appliedCoupon * 100}% de descuento)`).css('color', 'green');
        displayCart();
    } else {
        appliedCoupon = null;
        couponMessage.text('Cupón inválido o no reconocido.').css('color', 'red');
    }
};

// Actualizar carrito en localStorage
function updateCartInLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Proceder al pago
function proceedToPayment(totalAmount) {
    $.ajax({
        url: '/create-payment-intent',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ amount: totalAmount }),
        success: function (response) {
            const clientSecret = response.clientSecret;

            stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: card,
                }
            }).then(function (result) {
                if (result.error) {
                    alert('Error en el pago: ' + result.error.message);
                } else if (result.paymentIntent.status === 'succeeded') {
                    alert('¡Pago exitoso!');
                    localStorage.removeItem('cart');
                    cart = [];
                    displayCart();
                    saveOrder();
                }
            });
        },
        error: function (error) {
            console.error('Error al crear el intento de pago:', error);
        }
    });
}

// Guardar pedido en la base de datos (simulado)
function saveOrder() {
    $.ajax({
        url: '/save-order',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ cart }),
        success: function () {
            console.log('Pedido guardado exitosamente.');
        },
        error: function (error) {
            console.error('Error al guardar el pedido:', error);
        }
    });
}

// Obtener productos del servidor
$.get('http://localhost:3000/api/products', function (products) {
    displayProducts(products);
});

// Inicializar la página
$(document).ready(function () {
    displayCart();
});
