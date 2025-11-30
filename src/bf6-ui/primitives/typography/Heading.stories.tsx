import type { Meta, StoryObj } from '@storybook/react'
import { Heading } from './Heading'

const meta: Meta<typeof Heading> = {
  title: 'BF6 UI/Primitives/Heading',
  component: Heading,
  argTypes: {
    level: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6]
    },
    children: { control: 'text' }
  }
}

export default meta

type Story = StoryObj<typeof Heading>

export const Default: Story = {
  args: {
    level: 2,
    children: 'Sample Heading Text'
  }
}

export const AllHeadings: Story = {
  render: () => (
    <div className="space-y-4">
      <Heading level={1}>Heading Level 1</Heading>
      <Heading level={2}>Heading Level 2</Heading>
      <Heading level={3}>Heading Level 3</Heading>
      <Heading level={4}>Heading Level 4</Heading>
      <Heading level={5}>Heading Level 5</Heading>
      <Heading level={6}>Heading Level 6</Heading>
    </div>
  )
}