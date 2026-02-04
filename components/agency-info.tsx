'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AgencyInfoProps {
  agencyName: string;
  onUnlink: () => void;
}

export default function AgencyInfo({ agencyName, onUnlink }: AgencyInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agency Information</CardTitle>
        <CardDescription>
          You are currently linked to the following agency.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-semibold">{agencyName}</p>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="destructive" onClick={onUnlink}>
          Unlink Agency
        </Button>
      </CardFooter>
    </Card>
  );
}
