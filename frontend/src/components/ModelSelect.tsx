import { Select, createListCollection, Portal } from '@chakra-ui/react';
import { useOptimizationStore } from '@/store/useOptimizationStore';
import { useMemo } from 'react';

interface ModelSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  containerRef?: React.RefObject<HTMLElement>;
}

export function ModelSelect({
  value,
  onChange,
  placeholder,
  size = 'sm',
  disabled = false,
  containerRef
}: ModelSelectProps) {
  const models = useOptimizationStore(state => state.models);
  const modelOptions = useMemo(() => createListCollection({
    items: models.map(model => ({ label: model.displayName, value: model.id }))
  }), [models]);

  return (
    <Select.Root
      collection={modelOptions}
      size={size}
      onValueChange={details => {
        if (onChange && details.value?.[0]) {
          onChange(details.value[0]);
        }
      }}
      value={value ? [value] : []}
      disabled={disabled}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal container={containerRef}>
        <Select.Positioner>
          <Select.Content>
            {modelOptions.items.length > 0 ? (
              modelOptions.items.map((model) => (
                <Select.Item item={model} key={model.value}>
                  {model.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))
            ) : (
              <Select.Item item={{ value: '', label: '没有可用的模型' }}>
                没有可用的模型
              </Select.Item>
            )}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
} 