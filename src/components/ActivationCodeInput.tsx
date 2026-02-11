import React from 'react';

interface ActivationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export const ActivationCodeInput: React.FC<ActivationCodeInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  required = true,
}) => {
  const formatCode = (input: string): string => {
    const cleaned = input.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const formatted = cleaned.replace(/(.{8})(?=.)/g, '$1-');
    return formatted.substring(0, 39);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    onChange(formatted);
  };

  return (
    <div className='space-y-2'>
      <label
        htmlFor='activationCode'
        className='block text-sm font-medium text-gray-700'
      >
        卡密 {required && <span className='text-red-500'>*</span>}
      </label>
      <input
        id='activationCode'
        type='text'
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder='XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX'
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && <p className='text-sm text-red-600'>{error}</p>}
      <p className='text-xs text-gray-500'>
        卡密格式：XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX（32位字母数字）
      </p>
    </div>
  );
};
