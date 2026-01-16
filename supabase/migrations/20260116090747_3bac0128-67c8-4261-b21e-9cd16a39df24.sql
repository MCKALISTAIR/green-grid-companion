-- Create table for push notification subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_token TEXT NOT NULL UNIQUE,
  postcode TEXT NOT NULL,
  low_intensity_enabled BOOLEAN NOT NULL DEFAULT false,
  low_intensity_threshold INTEGER NOT NULL DEFAULT 100,
  daily_forecast_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_forecast_time TEXT NOT NULL DEFAULT '07:00',
  platform TEXT NOT NULL DEFAULT 'ios',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookup by device token
CREATE INDEX idx_push_subscriptions_device_token ON public.push_subscriptions(device_token);

-- Create index for finding subscriptions that need low intensity alerts
CREATE INDEX idx_push_subscriptions_low_intensity ON public.push_subscriptions(low_intensity_enabled, low_intensity_threshold) WHERE low_intensity_enabled = true;

-- Create index for finding subscriptions that need daily forecast
CREATE INDEX idx_push_subscriptions_daily_forecast ON public.push_subscriptions(daily_forecast_enabled, daily_forecast_time) WHERE daily_forecast_enabled = true;

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (device registration)
CREATE POLICY "Anyone can register device"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update their own device by token
CREATE POLICY "Anyone can update their device by token"
ON public.push_subscriptions
FOR UPDATE
USING (true);

-- Allow anyone to read their own device by token
CREATE POLICY "Anyone can read their device by token"
ON public.push_subscriptions
FOR SELECT
USING (true);

-- Allow anyone to delete their device by token
CREATE POLICY "Anyone can delete their device by token"
ON public.push_subscriptions
FOR DELETE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();