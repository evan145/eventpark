import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useToast } from '../components/Toast';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Helmet><title>Contact — EventPark</title></Helmet>
      <h1 className="text-2xl font-bold mb-4">Contact support</h1>
      {submitted ? (
        <p role="status" className="text-green-700" data-testid="contact-success">Thanks — we'll get back to you within one business day.</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
            toast.push('Message sent', 'success');
          }}
        >
          <div>
            <label htmlFor="c-email">Your email</label>
            <input id="c-email" type="email" required />
          </div>
          <div>
            <label htmlFor="c-message">Message</label>
            <textarea id="c-message" rows={4} required />
          </div>
          <button type="submit" className="btn-primary">Send</button>
        </form>
      )}
    </div>
  );
}
