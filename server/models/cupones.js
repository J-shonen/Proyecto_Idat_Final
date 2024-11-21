const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discount: { type: Number, required: true }, // Porcentaje de descuento
    expiresAt: { type: Date, required: true }, // Fecha de expiración
    usesRemaining: { type: Number, default: 1 }, // Opcional: Número de usos permitidos
    active: { type: Boolean, default: true } // Si el cupón está activo
});

module.exports = mongoose.model('Coupon', couponSchema);
