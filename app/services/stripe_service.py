import uuid


def create_payment_intent(amount_cents: int, application_fee_cents: int, connected_account_id: str | None = None) -> dict:
    return {
        "id": f"pi_test_{uuid.uuid4().hex[:16]}",
        "status": "succeeded",
        "amount": amount_cents,
        "application_fee_amount": application_fee_cents,
        "transfer_data": {"destination": connected_account_id},
    }


def refund_payment(payment_intent_id: str, amount_cents: int) -> dict:
    return {
        "id": f"re_test_{uuid.uuid4().hex[:16]}",
        "status": "succeeded",
        "payment_intent": payment_intent_id,
        "amount": amount_cents,
    }


def release_payout(booking) -> dict:
    return {
        "id": f"tr_test_{uuid.uuid4().hex[:16]}",
        "status": "paid",
        "amount": int(round(booking.host_payout_amount * 100)),
    }


def stripe_processing_fee_cents(total_cents: int) -> int:
    return int(round(total_cents * 0.029)) + 30
