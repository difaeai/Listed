"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Cpu, Bot, BrainCircuit, Play, StopCircle, TrendingUp, TrendingDown, DollarSign, Timer, Percent, Table as TableIcon, Loader2, Link as LinkIcon, X, Server, CheckCircle, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

type BotStatus = 'idle' | 'running' | 'stopping' | 'error' | 'achieved';
type MarketSentiment = 'Strong Sell' | 'Sell' | 'Neutral' | 'Buy' | 'Strong Buy';
type ExchangeStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type ExchangeVenue = 'binance' | 'coinbase' | 'kraken';

type Trade = {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  status: 'Open' | 'Closed' | 'Canceled';
  profit: number;
  timestamp: string;
};

const marketPairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT'];

export default function AgentMagnusPage() {
  const [analyzerStatus, setAnalyzerStatus] = useState<BotStatus>('idle');
  const [traderStatus, setTraderStatus] = useState<BotStatus>('idle');
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment>('Neutral');
  const [investmentAmount, setInvestmentAmount] = useState<number>(1000);
  const [desiredInvestment, setDesiredInvestment] = useState<number>(5000);
  const [investmentDuration, setInvestmentDuration] = useState<number>(24);
  const [expectedReturn, setExpectedReturn] = useState<number>(15);
  const [trades, setTrades] = useState<Trade[]>([]);
  
  const [exchangeStatus, setExchangeStatus] = useState<ExchangeStatus>('disconnected');
  const [exchangeVenue, setExchangeVenue] = useState<string | null>(null);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectToSse = useCallback(() => {
    if (eventSourceRef.current) {
        eventSourceRef.current.close();
    }
    const newEventSource = new EventSource('/api/bots/stream');
    eventSourceRef.current = newEventSource;
    
    newEventSource.onopen = () => console.log("SSE Connection Opened");
    newEventSource.onerror = (e) => {
        console.error("SSE Error:", e);
        newEventSource.close();
        setTimeout(connectToSse, 5000); // Attempt to reconnect after 5s
    };

    newEventSource.addEventListener('signals', (event) => {
        const data = JSON.parse(event.data);
        setMarketSentiment(data.sentiment || 'Neutral');
    });

    newEventSource.addEventListener('trades', (event) => {
        const newTrade = JSON.parse(event.data);
        setTrades(prevTrades => {
            const existingIndex = prevTrades.findIndex(t => t.id === newTrade.id);
            if (existingIndex !== -1) {
                const updatedTrades = [...prevTrades];
                updatedTrades[existingIndex] = newTrade;
                return updatedTrades;
            }
            return [newTrade, ...prevTrades].slice(0, 50);
        });
    });

     newEventSource.addEventListener('status', (event) => {
        const data = JSON.parse(event.data);
        if (data.bot === 'analyzer') setAnalyzerStatus(data.status);
        if (data.bot === 'trader') setTraderStatus(data.status);
    });

    return () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }
  }, []);

  useEffect(() => {
    const cleanupSse = connectToSse();
    
    fetch('/api/exchanges/status')
      .then(res => res.json())
      .then(data => {
        if(data.connected) {
            setExchangeStatus('connected');
            setExchangeVenue(data.venue);
        }
      });
      
    return cleanupSse;
  }, [connectToSse]);


  const toggleBot = async (bot: 'analyzer' | 'trader') => {
    const isStarting = (bot === 'analyzer' && analyzerStatus === 'idle') || (bot === 'trader' && traderStatus === 'idle');
    const endpoint = `/api/bots/${bot}/${isStarting ? 'start' : 'stop'}`;
    
    try {
      const options: RequestInit = { method: 'POST' };
      if (isStarting && bot === 'trader') {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify({
              investmentAmount,
              investmentDuration,
              desiredInvestment,
              expectedReturn,
          });
      }

      const response = await fetch(endpoint, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isStarting ? 'start' : 'stop'} ${bot}.`);
      }
      
      toast({ title: "Success", description: result.message });
      // Status will be updated via SSE

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: BotStatus) => {
    switch (status) {
        case 'idle': return <Badge variant="secondary">Idle</Badge>;
        case 'running': return <Badge className="bg-blue-500 text-white"><Loader2 className="mr-1 h-3 w-3 animate-spin"/>Running</Badge>;
        case 'stopping': return <Badge className="bg-yellow-500 text-white"><Loader2 className="mr-1 h-3 w-3 animate-spin"/>Stopping</Badge>;
        case 'achieved': return <Badge className="bg-green-500 text-white"><CheckCircle className="mr-1 h-3 w-3"/>Achieved</Badge>;
        case 'error': return <Badge variant="destructive">Error</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleConnectExchange = async (venue: ExchangeVenue) => {
    if(!apiKey || !apiSecret) {
        toast({ title: "Missing Credentials", description: "API Key and Secret are required.", variant: "destructive"});
        return;
    }
    setExchangeStatus('connecting');
    setIsConnectDialogOpen(false);
    
    try {
        const response = await fetch('/api/exchanges/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ venue, apiKey, secret: apiSecret, label: `${venue} Key 1` })
        });
        const result = await response.json();
        if(!response.ok) throw new Error(result.error || 'Failed to connect to exchange.');
        
        toast({ title: "Connected!", description: `Successfully connected to ${venue}.`});
        setExchangeStatus('connected');
        setExchangeVenue(venue);

    } catch (error: any) {
        toast({ title: "Connection Failed", description: error.message, variant: "destructive"});
        setExchangeStatus('error');
    }
    setApiKey('');
    setApiSecret('');
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Cpu className="mr-3 h-8 w-8 text-primary" /> Agent Magnus
          </h1>
          <p className="text-muted-foreground">Autonomous AI-Powered Crypto Trading & Analysis</p>
        </div>
        <div className="flex items-center gap-2">
            <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={exchangeStatus === 'connected' || exchangeStatus === 'connecting'}>
                        {exchangeStatus === 'connecting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LinkIcon className="mr-2 h-4 w-4"/>} 
                        {exchangeStatus === 'connected' ? 'Connected' : 'Connect to Exchange'}
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Connect to Binance (Testnet)</DialogTitle>
                        <DialogDescription>Enter your Binance Testnet API keys to authorize Agent Magnus.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="api-key">API Key</Label>
                            <Input id="api-key" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter your API Key"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="api-secret">API Secret</Label>
                            <Input id="api-secret" type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="Enter your API Secret"/>
                        </div>
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Ensure your API key has trade permissions enabled. For security, never enable withdrawal permissions.
                          </AlertDescription>
                        </Alert>
                    </div>
                     <DialogFooter>
                         <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                         <Button onClick={() => handleConnectExchange('binance')}>Connect</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             <Badge variant={exchangeStatus === 'connected' ? 'default' : 'secondary'} className={exchangeStatus === 'connected' ? 'bg-green-500 text-white' : ''}>
                {exchangeStatus === 'connected' ? `Connected to ${exchangeVenue}` : 
                 exchangeStatus === 'connecting' ? 'Connecting...' :
                 exchangeStatus === 'error' ? 'Connection Failed' :
                 'Not Connected'}
            </Badge>
             <Badge variant="outline" className="border-yellow-500 text-yellow-600">Testnet</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-blue-500"/> Market Analyzer Bot</CardTitle>
            <CardDescription>Generates signals from Binance testnet market data or simulation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <span className="font-medium">Bot Status:</span>
                {getStatusBadge(analyzerStatus)}
            </div>
            <div className="text-center p-6 border-dashed border-2 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Live Market Sentiment</p>
                <p className="text-3xl font-bold" style={{color: marketSentiment.includes('Buy') ? 'hsl(var(--accent))' : marketSentiment.includes('Sell') ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))'}}>
                    {marketSentiment}
                </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => toggleBot('analyzer')} disabled={analyzerStatus === 'stopping'}>
              {analyzerStatus === 'running' ? <StopCircle className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4"/>}
              {analyzerStatus === 'running' ? 'Stop Analyzer' : 'Start Analyzer'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="text-green-500"/> Trade Maker Bot</CardTitle>
            <CardDescription>Executes trades based on Market Analyzer signals.</CardDescription>
          </CardHeader>
           <CardContent className="space-y-6">
             <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <span className="font-medium">Bot Status:</span>
                {getStatusBadge(traderStatus)}
            </div>
            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="investment-amount" className="flex items-center gap-1.5"><DollarSign className="h-4 w-4"/>Investment Amount (USDT)</Label>
                    <Input id="investment-amount" type="number" value={investmentAmount} onChange={(e) => setInvestmentAmount(Number(e.target.value))} placeholder="e.g., 1000" disabled={traderStatus === 'running'}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="desired-investment" className="flex items-center gap-1.5"><DollarSign className="h-4 w-4"/>Add Desired Investment (USDT)</Label>
                    <Input id="desired-investment" type="number" value={desiredInvestment} onChange={(e) => setDesiredInvestment(Number(e.target.value))} placeholder="e.g., 5000" disabled={traderStatus === 'running'}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="investment-duration" className="flex items-center gap-1.5"><Timer className="h-4 w-4"/>Investment Duration (Hours)</Label>
                    <Input id="investment-duration" type="number" value={investmentDuration} onChange={(e) => setInvestmentDuration(Number(e.target.value))} placeholder="e.g., 24" disabled={traderStatus === 'running'}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="expected-return" className="flex items-center gap-1.5"><Percent className="h-4 w-4"/>Expected Return (%)</Label>
                    <div className="flex items-center gap-4">
                        <Slider
                            id="expected-return"
                            min={1} max={50} step={1}
                            value={[expectedReturn]}
                            onValueChange={(value) => setExpectedReturn(value[0])}
                            disabled={traderStatus === 'running'}
                            className="flex-1"
                        />
                        <span className="font-bold text-lg w-16 text-right">{expectedReturn}%</span>
                    </div>
                </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => toggleBot('trader')} disabled={analyzerStatus !== 'running' || traderStatus === 'stopping' || exchangeStatus !== 'connected'}>
              {traderStatus === 'running' ? <StopCircle className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4"/>}
              {traderStatus === 'running' ? 'Stop Trading' : 'Start Trading'}
            </Button>
          </CardFooter>
        </Card>
      </div>
        
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TableIcon/>Trade History</CardTitle>
          <CardDescription>Live feed of trades executed by Agent Magnus.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pair</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Profit/Loss (USDT)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map(trade => (
                    <TableRow key={trade.id}>
                        <TableCell className="font-medium">{trade.pair}</TableCell>
                        <TableCell>
                            <Badge variant={trade.type === 'BUY' ? 'default' : 'destructive'} className={trade.type === 'BUY' ? 'bg-green-600' : ''}>
                                {trade.type}
                            </Badge>
                        </TableCell>
                        <TableCell>{trade.amount.toFixed(4)}</TableCell>
                        <TableCell>{trade.price.toLocaleString(undefined, {style: 'currency', currency: 'USD'})}</TableCell>
                        <TableCell className={trade.profit > 0 ? 'text-green-600' : trade.profit < 0 ? 'text-red-600' : ''}>
                            {trade.status === 'Closed' ? trade.profit.toFixed(2) : '---'}
                        </TableCell>
                         <TableCell>
                            <Badge variant={trade.status === 'Open' ? 'secondary' : 'default'}>
                                {trade.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{new Date(trade.timestamp).toLocaleTimeString()}</TableCell>
                    </TableRow>
                ))}
                {trades.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center">No trades yet. Start the Trade Maker bot to see activity.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
