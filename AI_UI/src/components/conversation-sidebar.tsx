"use client";

import React, { useState, useEffect } from 'react';
import { useChat } from '@/context/chat-context';
import { 
  getAllConversationsMetadata, 
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
  Tra2,
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
      // Default share behavior - copy conversation link/id to clipboard
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
              This will permanently delete the conversation "{title}".
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

export function ConversationSidebar() {
  const { 
    conversationId, 
    switchConversation, 
    startNewConversation, 
    deleteCurrentConversation 
  } = useChat();
  
  const [conversations, setConversations] = useState<(ConversationMetadata & { id: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Update conversations list
  useEffect(() => {
    const loadConversations = () => {
      if (typeof window !== 'undefined') {
        const allConversations = getAllConversationsMetadata();
        setConversations(allConversations);
      }
    };
    
    loadConversations();
    
    // Set up interval to refresh conversations
    const intervalId = setInterval(loadConversations, 5000);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [conversationId]);
  
  // Filter conversations based on search term
  const filteredConversations = conversations.filter(
    (conversation) => conversation.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle conversation deletion
  const handleDelete = (id: string) => {
    if (id === conversationId) {
      deleteCurrentConversation();
    } else {
      // Update local state to immediately reflect the deletion
      setConversations(conversations.filter(c => c.id !== id));
    }
  };
  
  // Handle conversation rename
  const handleRename = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return; // Don't save empty titles
    
    // Get existing metadata
    const existingMeta = getConversationMetadata(id) || {
      title: `Conversation ${id.substring(0, 6)}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    // Update metadata with new title and timestamp
    const updatedMeta = {
      ...existingMeta,
      title: newTitle,
      updated: new Date().toISOString()
    };
    
    // Save updated metadata
    saveConversationMetadata(id, updatedMeta);
    
    // Update local state to immediately reflect the change
    setConversations(conversations.map(c => 
      c.id === id 
        ? { ...c, title: newTitle, updated: new Date().toISOString() } 
        : c
    ));
  };
  
  // Handle conversation sharing
  const handleShare = (id: string) => {
    // Copy conversation link/id to clipboard
    navigator.clipboard.writeText(`${window.location.origin}?conversation=${id}`)
      .then(() => {
        // Use a more subtle notification approach in a real app
        alert('Conversation link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };
  
  return (
    <div className="flex flex-col h-full border-r border-border dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-medium">Conversations</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={startNewConversation}
              className="h-8 w-8"
            >
              <PlusCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New conversation</TooltipContent>
        </Tooltip>
      </div>
      
      {/* Search */}
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
      
      {/* Conversation list */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-2">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                id={conversation.id}
                title={conversation.title}
                updated={conversation.updated}
                isActive={conversation.id === conversationId}
                onSwitch={switchConversation}
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
      
      {/* Footer */}
      <div className="p-4 border-t border-border dark:border-gray-700">
        <Button
          variant="outline"
          className="w-full justify-start text-sm"
          onClick={startNewConversation}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New chat
        </Button>
      </div>
    </div>
  );
} 