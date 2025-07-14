---
inclusion: fileMatch
fileMatchPattern: "{components/**/*,app/**/*.tsx,*.tsx}"
---

# MoneyFlow UI/UX Patterns

## Design System Standards

### HeroUI Component Usage
- Use HeroUI components as the foundation for all UI elements
- Customize HeroUI themes to match MoneyFlow branding
- Maintain consistent spacing using HeroUI's spacing system
- Follow HeroUI's accessibility guidelines for all interactions

### Color & Typography
- Use semantic color tokens for financial data (green for income, red for expenses)
- Implement consistent typography hierarchy across all pages
- Ensure proper contrast ratios for accessibility compliance
- Use Tailwind CSS utilities for consistent styling

### Layout Patterns
- Implement responsive design mobile-first approach
- Use consistent grid systems for data presentation
- Maintain proper spacing and alignment across components
- Design for both desktop and mobile PWA experiences

## Financial Data Presentation

### Transaction Display
- Show amounts with proper currency formatting
- Use consistent date formatting (relative dates when appropriate)
- Implement clear visual hierarchy for transaction importance
- Group transactions by date/category for better scanning

### Charts & Analytics
- Use Recharts for all financial visualizations
- Implement consistent color schemes across all charts
- Provide interactive tooltips with detailed information
- Ensure charts are responsive and accessible

### Form Design
- Use TanStack Form for complex financial forms
- Implement real-time validation with clear error messages
- Provide helpful placeholder text and examples
- Use progressive disclosure for complex forms

## Interaction Patterns

### Loading States
- Implement skeleton screens for data-heavy components
- Use optimistic updates for immediate user feedback
- Show progress indicators for long-running operations
- Provide clear error states with recovery options

### Navigation & Flow
- Maintain consistent navigation patterns across features
- Use breadcrumbs for deep navigation hierarchies
- Implement proper focus management for accessibility
- Design clear call-to-action buttons and flows

### Real-time Updates
- Show live indicators when data is being synchronized
- Implement smooth animations for data changes
- Provide notifications for important updates
- Handle offline states gracefully with proper messaging

## Accessibility Standards

### WCAG Compliance
- Ensure all interactive elements are keyboard accessible
- Provide proper ARIA labels for screen readers
- Maintain sufficient color contrast for all text
- Test with screen readers and keyboard navigation

### Mobile Accessibility
- Design touch targets with minimum 44px size
- Implement proper gesture support for mobile interactions
- Ensure content is readable without zooming
- Test on various device sizes and orientations