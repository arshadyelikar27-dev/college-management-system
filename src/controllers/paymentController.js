const Admission = require('../models/Admission');
const Payment = require('../models/Payment');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const getConfig = (req, res) => {
    res.json({ key: process.env.KEY_ID });
};

const createOrder = async (req, res) => {
    try {
        const { amount, admissionId } = req.body;

        if (!amount) {
            return res.status(400).json({ message: "Amount is required" });
        }

        const instance = new Razorpay({
            key_id: process.env.KEY_ID,
            key_secret: process.env.KEY_SECRET,
        });

        const options = {
            amount: Math.round(amount * 100), 
            currency: "INR",
            receipt: `rcpt_${Math.random().toString(36).substring(7)}`,
        };

        const order = await instance.orders.create(options);

        res.json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error) {
        console.error("Razorpay Order Creation Error:", error);
        res.status(500).json({ message: "Could not create Razorpay order." });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
            admissionId,
            amount 
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Incomplete payment details" });
        }

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {

            const existingPayment = await Payment.findOne({ orderId: razorpay_order_id });
            if (existingPayment) {
                return res.status(400).json({ message: "Payment already processed." });
            }

            const newPayment = new Payment({
                studentId: req.user.id,
                name: req.user.name,
                email: req.user.email || 'N/A',
                amount: amount || 0,
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                status: "success",
            });
            await newPayment.save();

            if (admissionId) {
                await Admission.findByIdAndUpdate(admissionId, { 
                    status: 'Paid', 
                    paymentId: razorpay_payment_id 
                });
            }

            res.json({
                msg: "success",
                status: "Payment verified successfully!"
            });
        } else {
            res.status(400).json({ message: "Invalid Signature" });
        }
    } catch (error) {
        console.error("Razorpay Verification Error:", error);
        res.status(500).json({ message: "Payment Verification failed." });
    }
};

module.exports = { createOrder, verifyPayment, getConfig };
