'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const defaultLanguages: ComboboxOption[] = [
  { label: 'Inlet', value: 'inlets' },
  { label: 'Outlet', value: 'outlets' },
  { label: 'Pipe', value: 'man_pipes' },
  { label: 'Drain', value: 'storm_drains' },
];

const FormSchema = z.object({
  language: z.string().nonempty('Choose'),
});

export interface ComboboxOption {
  label: string;
  value: string;
}

interface ComboboxFormProps {
  onSelect: (value: string) => void;
  value?: string;
  showSearch?: boolean;
  options?: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

export function ComboboxForm({
  onSelect,
  value,
  showSearch = true,
  options = defaultLanguages,
  placeholder = 'Choose',
  searchPlaceholder = 'Search...',
  emptyText = 'Not Found',
  disabled = false,
}: ComboboxFormProps) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { language: value ?? options[0]?.value ?? '' },
  });

  // Keep the form field in sync whenever parent 'value' changes
  useEffect(() => {
    form.setValue('language', value ?? options[0]?.value ?? '', {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [value, form, options]);

  return (
    <Form {...form}>
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col">
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        'w-full justify-between font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                      disabled={disabled}
                    >
                      {field.value
                        ? options.find((opt) => opt.value === field.value)
                            ?.label
                        : placeholder}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>

                <PopoverContent
                  className="p-0"
                  style={{ width: 'var(--radix-popover-trigger-width)' }}
                >
                  <Command>
                    {showSearch && (
                      <CommandInput
                        placeholder={searchPlaceholder}
                        className="h-9"
                      />
                    )}
                    <CommandList>
                      <CommandEmpty>{emptyText}</CommandEmpty>
                      <CommandGroup>
                        {options.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={() => {
                              // update RHF field and notify parent
                              field.onChange(option.value);
                              onSelect(option.value);
                            }}
                          >
                            {option.label}
                            <Check
                              className={cn(
                                'ml-auto',
                                option.value === field.value
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}
