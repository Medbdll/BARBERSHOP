import React, { useState } from 'react';
import Label from './Label';
import Input from './Input';
import Button from './Button';
import ValidationErrors from './ValidationErrors';
import ActionMessage from './ActionMessage';
import { forgotPassword } from '../../api/barberApi';

export default function ForgotPasswordForm({ onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState(null);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrors(null);
    setStatus(null);

    try {
      const res = await forgotPassword({ email });
      setStatus(res.message || 'We have emailed your password reset link!');
    } catch (err) {
      console.error('Password reset request failed:', err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else if (err.response?.data?.message) {
        setErrors([err.response.data.message]);
      } else {
        setErrors(['Unable to send reset link. Please verify your email address.']);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="mb-4 text-sm text-gray-600 leading-relaxed">
        Forgot your password? No problem. Just let us know your email address and
        we will email you a password reset link that will allow you to choose a new
        one.
      </div>

      <ValidationErrors errors={errors} className="mb-4" />
      {status && <ActionMessage message={status} type="success" className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" value="Email" />
          <Input
            id="email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block mt-1 w-full"
            required
            autoFocus
            autoComplete="username"
            placeholder="you@example.com"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          {onSwitchToLogin && (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
            >
              Back to login
            </button>
          )}

          <Button type="submit" processing={processing} className="ms-auto">
            Email Password Reset Link
          </Button>
        </div>
      </form>
    </div>
  );
}

