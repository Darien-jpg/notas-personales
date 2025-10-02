class NotesApp {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentUser = JSON.parse(localStorage.getItem('user'));
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentCategory = 'all';
        this.currentSearch = '';
        
        this.init();
    }

    init() {
        if (!this.token || !this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        this.bindEvents();
        this.loadNotes();
        this.displayUserInfo();
    }

    bindEvents() {
        // Botones de navegación
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('newNoteBtn').addEventListener('click', () => this.openModal());
        document.getElementById('searchBtn').addEventListener('click', () => this.searchNotes());
        
        // Filtros
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            this.loadNotes();
        });

        // Modal
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('noteForm').addEventListener('submit', (e) => this.saveNote(e));
        
        // Búsqueda con Enter
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchNotes();
        });
    }

    displayUserInfo() {
        document.getElementById('username').textContent = this.currentUser.username;
    }

    async loadNotes(page = 1) {
        try {
            const params = new URLSearchParams({
                page: page,
                limit: 8,
                category: this.currentCategory,
                search: this.currentSearch
            });

            const response = await fetch(`/api/notes?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.displayNotes(data.notes);
                this.setupPagination(data.currentPage, data.totalPages, data.total);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            this.showAlert('Error al cargar las notas: ' + error.message, 'error');
        }
    }

    displayNotes(notes) {
        const grid = document.getElementById('notesGrid');
        
        if (notes.length === 0) {
            grid.innerHTML = '<div class="no-notes">No hay notas para mostrar</div>';
            return;
        }

        grid.innerHTML = notes.map(note => `
            <div class="note-card" style="background-color: ${note.color}" data-id="${note._id}">
                ${note.isPinned ? '<div class="pin-indicator">📌</div>' : ''}
                <h3 class="note-title">${this.escapeHtml(note.title)}</h3>
                <p class="note-content">${this.escapeHtml(note.content)}</p>
                <div class="note-meta">
                    <span class="note-category ${note.category}">${this.getCategoryLabel(note.category)}</span>
                    <span class="note-date">${new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="note-actions">
                    <button class="btn btn-small btn-primary" onclick="app.editNote('${note._id}')">Editar</button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteNote('${note._id}')">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    async searchNotes() {
        this.currentSearch = document.getElementById('searchInput').value;
        this.currentPage = 1;
        await this.loadNotes();
    }

    openModal(note = null) {
        const modal = document.getElementById('noteModal');
        const form = document.getElementById('noteForm');
        
        if (note) {
            document.getElementById('modalTitle').textContent = 'Editar Nota';
            document.getElementById('noteId').value = note._id;
            document.getElementById('noteTitle').value = note.title;
            document.getElementById('noteContent').value = note.content;
            document.getElementById('noteCategory').value = note.category;
            document.getElementById('noteColor').value = note.color;
            document.getElementById('notePinned').checked = note.isPinned;
        } else {
            document.getElementById('modalTitle').textContent = 'Nueva Nota';
            form.reset();
            document.getElementById('noteColor').value = '#ffffff';
        }
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('noteModal').style.display = 'none';
    }

    async saveNote(e) {
        e.preventDefault();
        
        const noteData = {
            title: document.getElementById('noteTitle').value,
            content: document.getElementById('noteContent').value,
            category: document.getElementById('noteCategory').value,
            color: document.getElementById('noteColor').value,
            isPinned: document.getElementById('notePinned').checked
        };

        const noteId = document.getElementById('noteId').value;
        const url = noteId ? `/api/notes/${noteId}` : '/api/notes';
        const method = noteId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noteData)
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(noteId ? 'Nota actualizada exitosamente' : 'Nota creada exitosamente', 'success');
                this.closeModal();
                this.loadNotes();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            this.showAlert('Error al guardar la nota: ' + error.message, 'error');
        }
    }

    async editNote(noteId) {
        try {
            const response = await fetch(`/api/notes/${noteId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.openModal(data.note);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            this.showAlert('Error al cargar la nota: ' + error.message, 'error');
        }
    }

    async deleteNote(noteId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
            return;
        }

        try {
            const response = await fetch(`/api/notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert('Nota eliminada exitosamente', 'success');
                this.loadNotes();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            this.showAlert('Error al eliminar la nota: ' + error.message, 'error');
        }
    }

    setupPagination(currentPage, totalPages, total) {
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let html = '';
        
        // Botón anterior
        if (currentPage > 1) {
            html += `<button class="btn btn-small" onclick="app.loadNotes(${currentPage - 1})">Anterior</button>`;
        }
        
        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                html += `<span class="current-page">${i}</span>`;
            } else {
                html += `<button class="btn btn-small" onclick="app.loadNotes(${i})">${i}</button>`;
            }
        }
        
        // Botón siguiente
        if (currentPage < totalPages) {
            html += `<button class="btn btn-small" onclick="app.loadNotes(${currentPage + 1})">Siguiente</button>`;
        }
        
        pagination.innerHTML = html;
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getCategoryLabel(category) {
        const labels = {
            personal: 'Personal',
            work: 'Trabajo',
            study: 'Estudio',
            ideas: 'Ideas',
            other: 'Otros'
        };
        return labels[category] || category;
    }
}

// Inicializar la aplicación cuando se carga la página
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NotesApp();
});