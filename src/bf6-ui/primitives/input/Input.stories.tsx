import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './index';

const meta: Meta<typeof Input> = {
  title: 'BF6 UI/Primitives/Input',
  component: Input,
  argTypes: {
    type: { control: 'text' },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<typeof Input>;
export const Default: Story = {
  args: { placeholder: 'Type here...' }
};

export const WithSearchIcon: Story = {
  render: () => (
    <Input
      placeholder="Search..."
      addonLeft={
        <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z' />
        </svg>
      }
    />
  ),
};
