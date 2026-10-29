import React, { useState } from 'react';
import Label from './Label';
import Input from './Input';
import Button from './Button';
import Checkbox from './Checkbox';
import ValidationErrors from './ValidationErrors';
import ActionMessage from './ActionMessage';
import { useAuth } from '../../context/useAuth';

export default function RegisterForm({ onSwitchToLogin, onSuccess }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [terms, setTerms] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState(null);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!terms) {
      setErrors(['You must agree to the Terms of Service and Privacy Policy.']);
      return;
    }

    if (password !== passwordConfirmation) {
      setErrors(['The password confirmation does not match.']);
      return;
    }

    setProcessing(true);
    setErrors(null);
    setStatus(null);

    try {
      const res = await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setStatus(res.message || 'Account created successfully!');
      if (onSuccess) {
        onSuccess(res.user);
      }
    } catch (err) {
      console.error('Registration failed:', err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else if (err.response?.data?.message) {
        setErrors([err.response.data.message]);
      } else {
        setErrors(['Registration failed. Please check your inputs or try again later.']);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <ValidationErrors errors={errors} className="mb-4" />
      {status && <ActionMessage message={status} type="success" className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <Label htmlFor="name" value="Name" />
          <Input
            id="name"
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block mt-1 w-full"
            required
            autoFocus
            autoComplete="name"
            placeholder="John Doe"
          />
        </div>

        {/* Email */}
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
            autoComplete="username"
            placeholder="you@example.com"
          />
        </div>

        {/* Password */}
        <div>
          <Label htmlFor="password" value="Password" />
          <Input
            id="password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block mt-1 w-full"
            required
            autoComplete="new-password"
            placeholder="Min. 8 characters"
          />
        </div>

        {/* Password Confirmation */}
        <div>
          <Label htmlFor="password_confirmation" value="Confirm Password" />
          <Input
            id="password_confirmation"
            type="password"
            name="password_confirmation"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            className="block mt-1 w-full"
            required
            autoComplete="new-password"
            placeholder="Repeat password"
          />
        </div>

        {/* Terms of Service & Privacy Policy */}
        <div className="block pt-1">
          <label htmlFor="terms" className="flex items-start cursor-pointer">
            <Checkbox
              id="terms"
              name="terms"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5"
            />
            <span className="ms-2 text-xs text-gray-600 leading-snug select-none">
              I agree to the{' '}
              <span className="underline text-indigo-600 hover:text-indigo-800">Terms of Service</span>{' '}
              and{' '}
              <span className="underline text-indigo-600 hover:text-indigo-800">Privacy Policy</span>
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          {onSwitchToLogin && (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
            >
              Already registered?
            </button>
          )}

          <Button type="submit" processing={processing} className="ms-auto">
            Register
          </Button>
        </div>
      </form>
    </div>
  );
}
