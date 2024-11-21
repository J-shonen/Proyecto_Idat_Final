const mongoose = require('mongoose');

// Definimos el esquema de producto
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Creamos el modelo a partir del esquema
const Product = mongoose.model('product', productSchema);

module.exports = Product;
