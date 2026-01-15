"use client";

import React, { useState, useEffect } from 'react';
import { useChat } from '@/context/chat-context';
import {
  getAllConversationsMetadataSync as getAllConversationsMetadata,
  ConversationMetadata,
  getConversationMetadata,
  saveConversationMetadata
} from '@/lib/storage';
import { formatDistanceToNow } from 'date-fns';
import {
  Search,
  PlusCircle,
  MessageCircle,
  MoreVertical,
  Trash2,
  Pencil,
  Share2,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ConversationItemProps {
  id: string;
  title: string;
  updated: string;
  isActive: boolean;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onShare?: (id: string) => void;
}

function ConversationItem({
  id,
  title,
  updated,
  isActive,
  onSwitch,
  onDelete,
  onRename,
  onShare
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formatTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRename(id, newTitle);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setNewTitle(title);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    onRename(id, newTitle);
    setIsEditing(false);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) {
      onShare(id);
    } else {
       
      navigator.clipboard.writeText(`${window.location.origin}?conversation=${id}`)
        .then(() => {
          alert('Conversation link copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    }
  };

  const handleDeleteRequest = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    try {
      onDelete(id);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
    setShowDeleteModal(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between p-2 rounded-md hover:bg-primary/5 transition-all cursor-pointer group",
          isActive && "bg-primary/10 hover:bg-primary/10"
        )}
        onClick={() => onSwitch(id)}
      >
        <div className="flex items-center space-x-2 overflow-hidden flex-1">
          <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
          {isEditing ? (
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              autoFocus
              className="h-6 py-1 text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm truncate">{title}</span>
              <span className="text-xs text-muted-foreground">{formatTime(updated)}</span>
            </div>
          )}
        </div>

        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeleteRequest}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={handleCancelDelete}>
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">Are you sure?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete the conversation &ldquo;{title}&rdquo;.
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useRouter, usePathname } from 'next/navigation';
import { ConversationItemSkeleton } from '@/components/ui/loading';

 

export function ConversationSidebar() {
  const {
    conversationId,
    switchConversation,
    startNewConversation,
    deleteCurrentConversation
  } = useChat();

  const router = useRouter();
  const pathname = usePathname();

  const [conversations, setConversations] = useState<(ConversationMetadata & { id: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

   
  useEffect(() => {
    const loadConversations = async () => {
      setIsLoading(true);
      try {
        if (typeof window !== 'undefined') {
          const allConversations = await getAllConversationsMetadata();
          setConversations(allConversations);
        }
      } finally {
        setIsLoading(false);
      }
    };

     
    loadConversations();

     
    const handleConversationUpdate = () => loadConversations();
    window.addEventListener('conversationUpdated', handleConversationUpdate);

    return () => {
      window.removeEventListener('conversationUpdated', handleConversationUpdate);
    };
  }, [conversationId]);

   
  const filteredConversations = conversations.filter(
    (conversation) => conversation.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

   
  const handleDelete = (id: string) => {
    if (id === conversationId) {
      deleteCurrentConversation();
    } else {
       
      setConversations(conversations.filter(c => c.id !== id));
    }
  };

   
  const handleSwitchConversation = (id: string) => {
    switchConversation(id);

     
    if (pathname !== '/AI_UI') {
      router.push('/AI_UI');
    }
  };

   
  const handleRename = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;  

     
    const existingMeta = await getConversationMetadata(id) || {
      title: `Conversation ${id.substring(0, 6)}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

     
    const updatedMeta = {
      ...existingMeta,
      title: newTitle,
      updated: new Date().toISOString()
    };

     
    saveConversationMetadata(id, updatedMeta);

     
    setConversations(conversations.map(c =>
      c.id === id
        ? { ...c, title: newTitle, updated: new Date().toISOString() }
        : c
    ));
  };

   
  const handleShare = (id: string) => {
     
    navigator.clipboard.writeText(`${window.location.origin}?conversation=${id}`)
      .then(() => {
         
        alert('Conversation link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <div className="flex flex-col h-full border-r border-border dark:border-gray-700 overflow-hidden">
      { }
      <div className="p-4 border-b border-border dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-medium">Conversations</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                startNewConversation();
                if (pathname !== '/AI_UI') router.push('/AI_UI');
              }}
              className="h-8 w-8"
            >
              <PlusCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New conversation</TooltipContent>
        </Tooltip>
      </div>

      { }
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-8 h-9 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-2.5"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      { }
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-2">
          {isLoading ? (
             
            [...Array(5)].map((_, i) => (
              <ConversationItemSkeleton key={i} />
            ))
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                id={conversation.id}
                title={conversation.title}
                updated={conversation.updated}
                isActive={conversation.id === conversationId}
                onSwitch={handleSwitchConversation}
                onDelete={handleDelete}
                onRename={handleRename}
                onShare={handleShare}
              />
            ))
          ) : searchTerm ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No conversations match your search
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No conversations yet
            </div>
          )}
        </div>
      </ScrollArea>

      { }
      <div className="p-4 border-t border-border dark:border-gray-700">
        <Button
          variant="outline"
          className="w-full justify-start text-sm"
          onClick={() => {
            startNewConversation();
            if (pathname !== '/AI_UI') router.push('/AI_UI');
          }}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New chat
        </Button>
      </div>
    </div>
  );
} 
