import React, { useState } from 'react';
import Label from './Label';
import Input from './Input';
import Button from './Button';
import Checkbox from './Checkbox';
import ValidationErrors from './ValidationErrors';
import ActionMessage from './ActionMessage';
import { useAuth } from '../../context/useAuth';

export default function LoginForm({ onSwitchToRegister, onSwitchToForgotPassword, onSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState(null);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrors(null);
    setStatus(null);

    try {
      const res = await login({ email, password, remember });
      setStatus(res.message || 'Logged in successfully!');
      if (onSuccess) {
        onSuccess(res.user);
      }
    } catch (err) {
      console.error('Login failed:', err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else if (err.response?.data?.message) {
        setErrors([err.response.data.message]);
      } else {
        setErrors(['Unable to reach the server. Please verify your connection.']);
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
            autoFocus
            autoComplete="username"
            placeholder="you@example.com"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password" value="Password" />
            {onSwitchToForgotPassword && (
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-xs text-gray-600 hover:text-gray-900 underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded cursor-pointer"
              >
                Forgot your password?
              </button>
            )}
          </div>
          <Input
            id="password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block mt-1 w-full"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        {/* Remember Me */}
        <div className="block pt-1">
          <label htmlFor="remember_me" className="flex items-center cursor-pointer">
            <Checkbox
              id="remember_me"
              name="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="ms-2 text-sm text-gray-600 select-none">Remember me</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          {onSwitchToRegister && (
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
            >
              Don't have an account?
            </button>
          )}

          <Button type="submit" processing={processing} className="ms-auto">
            Log in
          </Button>
        </div>
      </form>
    </div>
  );
}
