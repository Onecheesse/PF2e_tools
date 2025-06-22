import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import os
import json
import shutil
import threading

# --- Hlavní třída aplikace ---
class JsonSorterApp:
    def __init__(self, root):
        """
        Inicializace grafického rozhraní aplikace.
        """
        self.root = root
        self.root.title("Třídič a slučovač JSON souborů")
        self.root.geometry("600x350")

        self.source_dir = tk.StringVar()
        self.dest_dir = tk.StringVar()

        main_frame = tk.Frame(root, padx=10, pady=10)
        main_frame.pack(fill="both", expand=True)

        tk.Label(main_frame, text="1. Zdrojová složka (kde jsou JSON soubory):").grid(row=0, column=0, sticky="w", pady=(0, 5))
        tk.Entry(main_frame, textvariable=self.source_dir, state="readonly", width=70).grid(row=1, column=0, sticky="ew")
        tk.Button(main_frame, text="Vybrat...", command=self.select_source_dir).grid(row=1, column=1, padx=(5, 0))

        tk.Label(main_frame, text="2. Cílová složka (kam se vytvoří struktura):").grid(row=2, column=0, sticky="w", pady=(10, 5))
        tk.Entry(main_frame, textvariable=self.dest_dir, state="readonly", width=70).grid(row=3, column=0, sticky="ew")
        tk.Button(main_frame, text="Vybrat...", command=self.select_dest_dir).grid(row=3, column=1, padx=(5, 0))

        self.sort_button = tk.Button(main_frame, text="3. Spustit kopírování a sloučení", command=self.start_sorting_thread, font=("Arial", 10, "bold"), bg="#007BFF", fg="white")
        self.sort_button.grid(row=4, column=0, columnspan=2, pady=(20, 10), sticky="ew")

        self.progress_bar = ttk.Progressbar(main_frame, orient="horizontal", length=100, mode="determinate")
        self.progress_bar.grid(row=5, column=0, columnspan=2, sticky="ew", pady=(5, 5))
        
        self.status_label = tk.Label(main_frame, text="Připraveno. Vyberte složky a spusťte proces.", bd=1, relief=tk.SUNKEN, anchor=tk.W)
        self.status_label.grid(row=6, column=0, columnspan=2, sticky="ew")

        main_frame.columnconfigure(0, weight=1)

    def select_source_dir(self):
        folder_selected = filedialog.askdirectory()
        if folder_selected:
            self.source_dir.set(folder_selected)
            self.status_label.config(text=f"Zdrojová složka: {folder_selected}")

    def select_dest_dir(self):
        folder_selected = filedialog.askdirectory()
        if folder_selected:
            self.dest_dir.set(folder_selected)
            self.status_label.config(text=f"Cílová složka: {folder_selected}")

    def start_sorting_thread(self):
        source = self.source_dir.get()
        dest = self.dest_dir.get()

        if not source or not dest:
            messagebox.showerror("Chyba", "Musíte vybrat zdrojovou i cílovou složku.")
            return
        if source == dest:
            messagebox.showwarning("Varování", "Zdrojová a cílová složka nemohou být stejné.")
            return

        self.sort_button.config(state="disabled", text="Pracuji...")
        self.progress_bar["value"] = 0
        
        thread = threading.Thread(target=self.process_files, args=(source, dest), daemon=True)
        thread.start()

    def process_files(self, source_path, dest_path):
        """
        Hlavní logika pro čtení, kopírování a slučování souborů.
        """
        try:
            # --- FÁZE 1: Načtení a seskupení dat ---
            self.status_label.config(text="Fáze 1: Načítám a analyzuji soubory...")
            all_files = os.listdir(source_path)
            json_files = [f for f in all_files if f.lower().endswith('.json')]
            total_files = len(json_files)

            if total_files == 0:
                self.status_label.config(text="Ve zdrojové složce nebyly nalezeny žádné .json soubory.")
                self.sort_button.config(state="normal", text="Spustit kopírování a sloučení")
                return

            self.progress_bar["maximum"] = total_files
            
            category_groups = {}
            processed_count = 0
            error_count = 0

            for filename in json_files:
                processed_count += 1
                source_file_path = os.path.join(source_path, filename)
                self.status_label.config(text=f"Načítám: {processed_count}/{total_files} - {filename}")

                try:
                    with open(source_file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    category = data.get('system', {}).get('category')
                    if not category:
                        category = "_other"

                    if category not in category_groups:
                        category_groups[category] = []
                    
                    category_groups[category].append((filename, data))

                except (json.JSONDecodeError, KeyError) as e:
                    error_count += 1
                    print(f"Chyba při zpracování souboru '{filename}': {e}")
                
                self.progress_bar["value"] = processed_count
                self.root.update_idletasks()
            
            # --- FÁZE 2: Zápis, kopírování a slučování ---
            self.status_label.config(text="Fáze 2: Vytvářím složky, kopíruji a slučuji soubory...")
            total_categories = len(category_groups)
            processed_categories = 0
            
            for category, files_data in category_groups.items():
                processed_categories += 1
                self.status_label.config(text=f"Zpracovávám kategorii: {processed_categories}/{total_categories} - '{category}'")
                
                category_folder_path = os.path.join(dest_path, category)
                os.makedirs(category_folder_path, exist_ok=True)
                
                combined_json_content = {}
                
                for filename, data in files_data:
                    source_file_path = os.path.join(source_path, filename)
                    dest_file_path = os.path.join(category_folder_path, filename)
                    shutil.copy(source_file_path, dest_file_path)
                    
                    key = data.get('_id', filename)
                    combined_json_content[key] = data

                # Vytvoření a zápis souhrnného souboru
                combined_filename = f"_equipment_{category}_complete.json"
                
                # <<< ZMĚNA: Souhrnný soubor se ukládá přímo do hlavní cílové složky (dest_path).
                combined_filepath = os.path.join(dest_path, combined_filename)
                
                with open(combined_filepath, 'w', encoding='utf-8') as f:
                    json.dump(combined_json_content, f, indent=4, ensure_ascii=False)

            # Závěrečná zpráva
            final_message = f"Hotovo! Zpracováno {total_files} souborů do {total_categories} kategorií. Chyby: {error_count}."
            self.status_label.config(text=final_message)
            messagebox.showinfo("Dokončeno", final_message)

        except Exception as e:
            self.status_label.config(text=f"Kritická chyba: {e}")
            messagebox.showerror("Chyba", f"Došlo k závažné chybě: {e}")
        finally:
            self.sort_button.config(state="normal", text="Spustit kopírování a sloučení")

# --- Spuštění aplikace ---
if __name__ == "__main__":
    root = tk.Tk()
    app = JsonSorterApp(root)
    root.mainloop()