import type { Meta, StoryObj } from '@storybook/react'
import { Quote } from './index'

const meta: Meta<typeof Quote> = {
  title: 'BF6 UI/Primitives/Quote',
  component: Quote,
};
export default meta

type Story = StoryObj<typeof Quote>

export const Default: Story = {
  args: {
    children: 'This is a sample weapon description rendered using BF6Quote.',
  },
}