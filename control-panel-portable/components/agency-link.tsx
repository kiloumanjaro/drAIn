'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getAgencies } from '@/lib/supabase/profile';
import { CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface AgencyLinkProps {
  onLink?: (agencyId: string, agencyName: string) => Promise<void>;
  disabled?: boolean;
}

export default function AgencyLink({ onLink, disabled }: AgencyLinkProps) {
  const [selectedAgency, setSelectedAgency] = useState('');
  const [selectedAgencyName, setSelectedAgencyName] = useState('');
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const fetchedAgencies = await getAgencies();
        if (fetchedAgencies) {
          setAgencies(fetchedAgencies);
        }
      } catch (error) {
        console.error('Failed to fetch agencies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgencies();
  }, []);

  const handleLinkAgency = async () => {
    if (onLink) {
      await onLink(selectedAgency, selectedAgencyName);
    }
  };

  const handleValueChange = (value: string) => {
    setSelectedAgency(value);
    const agency = agencies.find((a) => a.id === value);
    setSelectedAgencyName(agency ? agency.name : '');
  };

  return (
    <>
      <Label htmlFor="agency" className="mb-2">
        Agency Link
      </Label>
      <label className="text-muted-foreground mb-5 text-xs leading-tight">
        All partnered agencies available on the platform. By linking your
        account to a verified agency, you can access exclusive admin features.
      </label>
      <Select onValueChange={handleValueChange} disabled={disabled || loading}>
        <SelectTrigger id="agency" className="flex w-full">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent position="popper">
          {loading ? (
            <SelectItem value="loading" disabled>
              Loading agencies...
            </SelectItem>
          ) : agencies.length === 0 ? (
            <SelectItem value="no-agencies" disabled>
              No agencies available
            </SelectItem>
          ) : (
            agencies.map((agency) => (
              <SelectItem key={agency.id} value={agency.id}>
                {agency.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Add agreement checkbox */}
      <div className="flex items-start space-x-2 pt-2">
        <Checkbox
          id="agreement"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked as boolean)}
          disabled={disabled}
          className="mt-1"
        />
        <label
          htmlFor="agreement"
          className="text-muted-foreground text-xs leading-tight"
        >
          I understand this is a demo environment. Actions here reflect on the
          linked agency. I will use features responsibly and avoid reckless
          tampering.
        </label>
      </div>

      <CardFooter className="flex justify-end p-0 pt-4">
        <Button
          onClick={handleLinkAgency}
          disabled={disabled || !selectedAgency || !agreed}
        >
          Link Agency
        </Button>
      </CardFooter>
    </>
  );
}
