import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Info, ArrowRight } from "lucide-react";

export default function DesignSystemPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-5xl space-y-16">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Design System Showcase</h1>
        <p className="text-lg text-muted-foreground">
          Premium Utilitarian Minimalism — Farmer-First High Contrast UI
        </p>
      </div>

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-border pb-2">Typography</h2>
        <div className="space-y-4">
          <div>
            <span className="text-sm text-muted-foreground font-mono">text-4xl font-bold (Display)</span>
            <h1 className="text-4xl font-bold mt-1">The quick brown fox jumps over the lazy dog</h1>
          </div>
          <div>
            <span className="text-sm text-muted-foreground font-mono">text-2xl font-semibold (Headline)</span>
            <h2 className="text-2xl font-semibold mt-1">The quick brown fox jumps over the lazy dog</h2>
          </div>
          <div>
            <span className="text-sm text-muted-foreground font-mono">text-base (Body)</span>
            <p className="text-base mt-1">
              PashuSeva connects livestock owners in rural India with verified veterinary professionals. 
              Built for speed, high contrast, and accessibility on low-end devices.
            </p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground font-mono">text-sm text-muted-foreground (Caption)</span>
            <p className="text-sm text-muted-foreground mt-1">
              Secondary text for hints, timestamps, and supplementary information.
            </p>
          </div>
        </div>
      </section>

      {/* Colors */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-border pb-2">Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-background text-foreground rounded-lg border border-border">
            <div className="font-medium">Background</div>
            <div className="text-xs opacity-80 mt-1 font-mono">#fbfbfa / #111111</div>
          </div>
          <div className="p-4 bg-card text-card-foreground rounded-lg border border-border">
            <div className="font-medium">Card</div>
            <div className="text-xs opacity-80 mt-1 font-mono">#ffffff / #1c1c1c</div>
          </div>
          <div className="p-4 bg-primary text-primary-foreground rounded-lg border border-border">
            <div className="font-medium">Primary</div>
            <div className="text-xs opacity-80 mt-1 font-mono">#16a34a / #22c55e</div>
          </div>
          <div className="p-4 bg-secondary text-secondary-foreground rounded-lg border border-border">
            <div className="font-medium">Secondary</div>
            <div className="text-xs opacity-80 mt-1 font-mono">#edf3ec / #243525</div>
          </div>
          <div className="p-4 bg-muted text-muted-foreground rounded-lg border border-border">
            <div className="font-medium">Muted</div>
            <div className="text-xs opacity-80 mt-1 font-mono">#eaeaea / #2a2a2a</div>
          </div>
          <div className="p-4 bg-destructive text-destructive-foreground rounded-lg border border-border">
            <div className="font-medium">Destructive</div>
            <div className="text-xs opacity-80 mt-1 font-mono">#dc2626 / #ef4444</div>
          </div>
          <div className="p-4 bg-accent text-accent-foreground rounded-lg border border-border">
            <div className="font-medium">Accent</div>
            <div className="text-xs opacity-80 mt-1 font-mono">#f7f6f3 / #2a2a2a</div>
          </div>
          <div className="p-4 bg-border text-foreground rounded-lg border border-border">
            <div className="font-medium">Border</div>
            <div className="text-xs opacity-80 mt-1 font-mono">#eaeaea / #333333</div>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-border pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="destructive">Destructive (SOS)</Button>
          <Button variant="link">Link Button</Button>
          <Button disabled>Disabled State</Button>
          <Button>
            <ArrowRight className="w-4 h-4 mr-2" /> With Icon
          </Button>
        </div>
        <div className="flex gap-4 items-center mt-4">
          <Button size="lg">Large Size</Button>
          <Button size="default">Default Size</Button>
          <Button size="sm">Small Size</Button>
        </div>
      </section>

      {/* Inputs & Forms */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-border pb-2">Inputs & Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Standard Text Input</label>
              <Input placeholder="Enter your phone number..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Disabled Input</label>
              <Input disabled placeholder="Disabled field" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Dropdown</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine Checkup</SelectItem>
                  <SelectItem value="vaccination">Vaccination</SelectItem>
                  <SelectItem value="emergency">Emergency SOS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-6 pt-6">
            <div className="flex items-center space-x-2">
              <Switch id="airplane-mode" />
              <label htmlFor="airplane-mode" className="text-sm font-medium leading-none">
                Available for Duty (Switch)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" />
              <label htmlFor="terms" className="text-sm font-medium leading-none">
                Accept terms and conditions (Checkbox)
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-border pb-2">Cards & Layout</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Routine Visit</CardTitle>
              <CardDescription>Scheduled checkup for 2 cattle</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Provider will arrive on Monday, 10:00 AM.</p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Cancel</Button>
              <Button>Confirm</Button>
            </CardFooter>
          </Card>
          
          <Card className="border-destructive/30 bg-destructive/5 dark:bg-destructive/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-destructive">Emergency SOS</CardTitle>
                <Badge variant="destructive">Urgent</Badge>
              </div>
              <CardDescription>Requested 5 mins ago</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">Distance: 4.2 km</p>
              <p className="text-sm text-muted-foreground mt-1">Severe injury to leg, bleeding heavily.</p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline">Decline</Button>
              <Button variant="destructive">Accept Request</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Badges & Alerts */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-border pb-2">Badges & Alerts</h2>
        <div className="flex flex-wrap gap-4 mb-6">
          <Badge>Default Badge</Badge>
          <Badge variant="secondary">Secondary Badge</Badge>
          <Badge variant="outline">Outline Badge</Badge>
          <Badge variant="destructive">Destructive Badge</Badge>
        </div>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Notice</AlertTitle>
            <AlertDescription>
              Your duty lease will expire in 2 hours. Please renew to stay visible.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to connect to the server. Please check your connection.
            </AlertDescription>
          </Alert>
          <Alert className="border-primary/50 bg-primary/5 text-primary">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Verification documents submitted successfully.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Tabs & Navigation */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-border pb-2">Tabs & Navigation</h2>
        <Tabs defaultValue="active" className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Requests</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="p-4 border rounded-lg mt-2 bg-card">
            <p className="text-sm text-muted-foreground">You have no active requests.</p>
          </TabsContent>
          <TabsContent value="history" className="p-4 border rounded-lg mt-2 bg-card">
            <p className="text-sm text-muted-foreground">Past completed visits will appear here.</p>
          </TabsContent>
        </Tabs>
      </section>

    </div>
  );
}
