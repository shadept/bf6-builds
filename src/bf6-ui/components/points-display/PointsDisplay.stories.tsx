import type { Meta, StoryObj } from '@storybook/react'
import { PointsDisplay } from './index'

const meta: Meta<typeof PointsDisplay> = {
  title: 'BF6 UI/Components/PointsDisplay',
  component: PointsDisplay,
  argTypes: {
    usedPoints: { control: 'number' },
    maxPoints: { control: 'number' },
  },
}
export default meta

type Story = StoryObj<typeof PointsDisplay>

export const Default: Story = {
  args: { usedPoints: 35, maxPoints: 100 },
}
