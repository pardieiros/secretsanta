import { useEffect, useRef } from "react";
import { pusher } from "../lib/pusher";

export function useChannel(channelName: string, event: string, callback: (data: any) => void) {
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!channelName || !event) {
      return;
    }

    // Check if channel is already subscribed
    const existingChannel = pusher.channel(channelName);
    const channel = existingChannel || pusher.subscribe(channelName);

    // Wait for subscription to be successful (only if not already subscribed)
    if (!existingChannel) {
      channel.bind('pusher:subscription_error', (error: any) => {
        console.error(`[useChannel] Subscription error for channel ${channelName}:`, error);
      });
    }

    const handler = (data: any) => {
      callbackRef.current(data);
    };

    // Bind the event handler
    channel.bind(event, handler);

    return () => {
      channel.unbind(event, handler);
      // Don't unsubscribe the channel itself, as it might be used by other components
      // Only unsubscribe if this is the last listener (we can't easily check this, so we'll keep it subscribed)
    };
  }, [channelName, event]);
}


