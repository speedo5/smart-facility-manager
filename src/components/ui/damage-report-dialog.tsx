import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface DamageReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (report: { hasDamage: boolean; description: string }) => void;
  facilityName: string;
  userName: string;
}

export function DamageReportDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  facilityName,
  userName 
}: DamageReportDialogProps) {
  const [hasDamage, setHasDamage] = useState(false);
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    onSubmit({ hasDamage, description });
    setHasDamage(false);
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Check-out</DialogTitle>
          <DialogDescription>
            Approving check-out for {userName} from {facilityName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <Label htmlFor="damage">Report Damage</Label>
            </div>
            <Switch
              id="damage"
              checked={hasDamage}
              onCheckedChange={setHasDamage}
            />
          </div>
          
          {hasDamage && (
            <div className="space-y-2">
              <Label htmlFor="description">Damage Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the damage or issue..."
                rows={4}
                required
              />
            </div>
          )}
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={hasDamage && !description.trim()}
            >
              Approve Check-out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
