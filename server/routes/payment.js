const express = require('express');
const stripe = require('stripe')('tu_clave_secreta_de_stripe');
const router = express.Router();

router.post('/checkout', async (req, res) => {
  const { cart, userId } = req.body;
  try {
    let totalAmount = 0;

    // Calcular el total del carrito
    for (let item of cart) {
      const product = await Product.findById(item.productId);
      totalAmount += product.price * item.quantity;
    }

    // Crear una sesión de pago en Stripe
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: await Promise.all(cart.map(async (item) => {
          const product = await Product.findById(item.productId);
          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: product.name,
              },
              unit_amount: product.price * 100, // en centavos
            },
            quantity: item.quantity,
          };
        })),
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/cancel`,
      });

    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
