import { NextPage } from "next";
import React, { useEffect, useRef, useState } from 'react';
import { db, storage } from '../config/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid'; // Para gerar um ID único para cada upload
import { Box, Button, CloseIcon, Modal, Text } from "@saleor/macaw-ui";
import { ComputerDesktopIcon, DeviceTabletIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/20/solid'


interface FileObj {
  file: File;
  id: string;
  progress: number;
}

interface Banner {
  id: string;
  image: string;
  link?: string; // Supondo que link seja opcional
  pc: boolean;
  mobile: boolean;
  tablet: boolean;
  priority: number;
}



const IndexPage: NextPage = () => {

  const [files, setFiles] = useState<FileObj[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(false); // Novo estado para verificar se o upload foi concluído

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = [];
    const fileList = e.target.files;

    for (const file of fileList) {
      if (file.size <= 2097152) { // 2MB
        const newFile = {
          file: file,
          id: uuidv4(), // Gerar um ID único
          progress: 0
        };
        selectedFiles.push(newFile);
      } else {
        alert(`A imagem ${file.name} é maior que 2MB e não será carregada.`);
      }
    }

    setFiles(selectedFiles);
  };

  const uploadFile = (fileObj: any) => {
    setUploading(true);
    setCompleted(false);

    const fileRef = storageRef(storage, `images/${fileObj.file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, fileObj.file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // Atualizar o progresso do arquivo específico
        setFiles(prevFiles => prevFiles.map(file => {
          if (file.id === fileObj.id) {
            return { ...file, progress: progress };
          }
          return file;
        }));
      },
      (error) => {
        console.error('Upload error:', error);
        setUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          // Aqui vamos salvar o URL da imagem no Firestore
          const slideData = {
            image: downloadURL,
            link: '', // Adicione o link caso necessário
            pc: false,
            mobile: false,
            tablet: false,
            priority: 1,
          };

          addDoc(collection(db, 'slides'), slideData)
            .then(() => {
              // Quando o documento é adicionado com sucesso, atualizamos o estado para remover o arquivo da lista
              setFiles(prevFiles => prevFiles.filter(file => file.id !== fileObj.id));
              if (files.length <= 1) {
                // Se era o último arquivo a ser carregado, reinicializamos tudo
                setUploading(false);
                // Fechar o modal programaticamente aqui se necessário
                // Exemplo: $('#staticBackdrop').modal('hide');
              }
            })
            .catch((error) => {
              console.error('Error adding document: ', error);
              setUploading(false);
            });
        }
        );
      }
    );

  };

  const handleUpload = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Para cada arquivo no estado, iniciar o processo de upload
    files.forEach(uploadFile);
    setCompleted(true);
  };

  const handleRemoveFile = (id: any) => {
    // Remover arquivo do estado quando o botão remover é clicado
    setFiles(prevFiles => prevFiles.filter(file => file.id !== id));
  };

  const clearFiles = () => {
    // Limpar toda a seleção de arquivos
    setFiles([]);
  };

  const closeModal = () => {
    // Reseta os estados quando o modal é fechado
    setFiles([]);
    setCompleted(false);
    setUploading(false);
    fetchBanners();
    setOpen(false)
    // ('#staticBackdrop').modal('hide');

  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para abrir a caixa de diálogo do arquivo quando o botão personalizado é clicado
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };



  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const bannerCollectionRef = collection(db, 'slides');
    const bannerSnapshot = await getDocs(bannerCollectionRef);
    const bannerList: Banner[] = bannerSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() as Banner })) // Use 'as Banner' para garantir a tipagem
      .sort((a, b) => a.priority - b.priority);
    setBanners(bannerList);
  };

  const handleDragStart = (e: any, draggedItem: any) => {
    e.dataTransfer.setData('application/reactflow', draggedItem.id); // Set the item's ID
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: any) => {
    e.preventDefault(); // Necessary for the drop event to fire.
  };

  const handleDrop = async (e: any, overItem: any) => {
    e.preventDefault();
    const draggedItemId = e.dataTransfer.getData('application/reactflow');
    const draggedItemIndex = banners.findIndex(banner => banner.id === draggedItemId);
    const overItemIndex = banners.findIndex(banner => banner.id === overItem.id);

    if (draggedItemIndex === overItemIndex) {
      return; // Item dropped on itself, no change
    }

    // Reorder the list
    const reorderedList = [...banners];
    const [draggedItem] = reorderedList.splice(draggedItemIndex, 1);
    reorderedList.splice(overItemIndex, 0, draggedItem);

    setBanners(reorderedList);

    // Update the priorities in the database
    for (let i = 0; i < reorderedList.length; i++) {
      const bannerRef = doc(db, 'slides', reorderedList[i].id);
      await updateDoc(bannerRef, {
        priority: i
      });
    }
  };

  //Novo MOdal

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Banner[]>([]);

  const handleEdit = (banner: any) => {
    setCurrentBanner(banner); // Define os dados do banner atual no estado
    setIsModalOpen(true); // Abre o modal
  };

  
  const handleSave = async () => {
    // Verifica se currentBanner é válido
    if (currentBanner && currentBanner.id) {
      const bannerRef = doc(db, 'slides', currentBanner.id);
      await updateDoc(bannerRef, currentBanner);
      setIsModalOpen(false); // Fecha o modal após salvar
      // Atualiza a lista de banners ou faz outra ação necessária após o salvamento
      fetchBanners(); // Supondo que você tenha uma função para buscar banners
    }
  };


  const handleDelete = async (bannerId: any) => {
    // Confirmação antes de proceder com a exclusão

    // Referência ao documento do banner a ser excluído
    const bannerRef = doc(db, 'slides', bannerId?.id);

    try {
      // Exclui o documento do banco de dados
      await deleteDoc(bannerRef);

      // Atualiza a lista de banners para refletir a exclusão (opcional)
      // Isso pode envolver refazer a consulta ao banco de dados ou simplesmente atualizar o estado local
      setBanners(banners.filter(banner => banner.id !== bannerId?.id));

      // Feedback ao usuário (opcional)
      console.log("Banner excluído com sucesso!");
    } catch (error) {
      // Tratamento de erro, se necessário
      console.error("Erro ao excluir o banner:", error);
      console.log("Ocorreu um erro ao tentar excluir o banner.");
    }


    // const isConfirmed = window.confirm("Tem certeza de que deseja excluir este banner?");
    // if (isConfirmed) {
    //   // Referência ao documento do banner a ser excluído
    //   const bannerRef = doc(db, 'slides', bannerId?.id);

    //   try {
    //     // Exclui o documento do banco de dados
    //     await deleteDoc(bannerRef);

    //     // Atualiza a lista de banners para refletir a exclusão (opcional)
    //     // Isso pode envolver refazer a consulta ao banco de dados ou simplesmente atualizar o estado local
    //     setBanners(banners.filter(banner => banner.id !== bannerId?.id));

    //     // Feedback ao usuário (opcional)
    //     alert("Banner excluído com sucesso!");
    //   } catch (error) {
    //     // Tratamento de erro, se necessário
    //     console.error("Erro ao excluir o banner:", error);
    //     alert("Ocorreu um erro ao tentar excluir o banner.");
    //   }
    // }
  };


  return (
    <Box padding={4}>
      <div className="bg-body-secondary px-3 py-2 rounded-top fs-6 border border-1 border-bottom-0 fw-bolder text-uppercase text-primary-emphasis barraTitulo d-md-flex justify-content-md-between align-items-md-center">
        <p> Gerência de Banners</p>
        <Button onClick={() => setOpen(true)}>Adicionar Banners</Button>
      </div>

      <Modal open={open} onChange={setOpen}>
        <Modal.Content>
          <Box className="modal-responsivo" __backgroundColor="#fff" __padding={10} __boxShadow="defaultModal" __left="50%" __top="50%" position="fixed" __transform="translate(-50%, -50%)">
            <div className="modal-content">
              <div className="modal-header slide-banner-header" >
                <h5 className="modal-title">Adicionar Slides</h5>
                {!uploading && (
                  <Modal.Close>
                    <Button
                      icon={<CloseIcon />}
                      size="small"
                      variant="tertiary"
                    />
                  </Modal.Close>
                )}

              </div>
              <hr />
              <div className="modal-body mt-2">
                <button type="button" className="btn btn-dark me-2" onClick={handleButtonClick} disabled={uploading}>
                  Escolha os arquivos
                </button>

                {!completed && (
                  <>
                    <button type="button" className="btn btn-warning me-2" onClick={clearFiles} disabled={uploading}>
                      Limpar fila
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleUpload} disabled={uploading || files.length === 0}>
                      Realizar upload
                    </button>
                  </>
                )}
                {/* Input do arquivo oculto */}
                <input
                  type="file"
                  multiple
                  onChange={handleImageChange}
                  disabled={uploading}
                  ref={fileInputRef}
                  style={{ display: 'none' }} // Ocultar o input
                />

                {/* Lista de arquivos para upload */}
                {files.map((fileObj) => (
                  <div key={fileObj?.id} >
                    <div className='font-upload'>
                      <p>{fileObj?.file?.name}</p>
                      <button onClick={() => handleRemoveFile(fileObj.id)} className="btn btn-danger" disabled={uploading}>Remover</button>
                    </div>
                    <div className="progress">
                      <div className="progress-bar" role="progressbar" style={{ width: `${fileObj?.progress}%` }} aria-valuenow={fileObj?.progress} aria-valuemin="0" aria-valuemax="100">{fileObj?.progress}%</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                {completed && (
                  <button type="button" className="btn btn-danger" onClick={closeModal}>
                    Fechar
                  </button>
                )}

              </div>
            </div>
          </Box>
        </Modal.Content>
      </Modal>

      <Modal open={isModalOpen} onChange={setIsModalOpen}>
        <Modal.Content>
          <Box className="modal-responsivo" __backgroundColor="#fff" __padding={10} __boxShadow="defaultModal" __left="50%" __top="50%" position="fixed" __transform="translate(-50%, -50%)">

            <div className="modal-content">
              <div className="modal-header slide-banner-header">
                <h5 className="modal-title">Configurações do Banner</h5>
                <Modal.Close>
                  <Button
                    icon={<CloseIcon />}
                    size="small"
                    variant="tertiary"
                  />
                </Modal.Close>
              </div>
              <hr />
              <div className="modal-body p-2">
                {/* Formulário de edição */}
                <form onSubmit={e => e.preventDefault()}>
                  {/* Aqui você pode adicionar mais campos de entrada conforme necessário */}
                  <div className="mb-3">
                    <label htmlFor="externalLink" className="form-label">Link Externo</label>
                    <input
                      type="text"
                      className="form-control"
                      id="externalLink"
                      value={currentBanner?.link || ''} // Garanta que 'link' está correto conforme a estrutura do seu objeto
                      onChange={(e) => setCurrentBanner({ ...currentBanner, link: e.target.value })}
                    />

                  </div>

                  <div className="mb-3">
                    {/* Selecione se é uma imagem ou texto */}
                    <div className="btn-group" role="group" aria-label="Tipo de slide">
                      <input
                        type="checkbox"
                        className="btn-check"
                        name="slideType"
                        id="mobile"
                        autoComplete="off"
                        checked={currentBanner?.mobile}
                        onChange={(e) => setCurrentBanner({ ...currentBanner, mobile: e.target.checked })}
                      />
                      <label className="btn btn-outline-primary" htmlFor="mobile"><DeviceTabletIcon className="icon-hero" /></label>

                      <input
                        type="checkbox"
                        className="btn-check"
                        name="slideType"
                        id="pc"
                        autoComplete="off"
                        checked={currentBanner?.pc}
                        onChange={(e) => setCurrentBanner({ ...currentBanner, pc: e.target.checked })}
                      />
                      <label className="btn btn-outline-primary" htmlFor="pc"><ComputerDesktopIcon className="icon-hero" /></label>
                    </div>
                  </div>


                  {/* Visualização do slide */}
                  <div className="card">
                    {/* Substitua por uma imagem dinâmica ou componente de texto conforme necessário */}
                    <img src={currentBanner?.image} className="card-img-top" alt="Slide Preview" />
                  </div>

                  {/* Botões de ação */}
                  <div className="modal-footer mt-2">
                    {/* <button type="button" className="btn btn-secondary" onClick={onRequestClose}>Fechar</button> */}
                    <Modal.Close>
                      <Button
                        className="mx-2"
                        size="large"
                        variant="secondary"
                      >
                        Fechar
                      </Button>
                    </Modal.Close>


                    <Button size="large" onClick={() => handleSave()}>Salvar</Button>
                  </div>
                </form>
              </div>
            </div>
          </Box>
        </Modal.Content>
      </Modal>

      <div className='p-3 cont-banners'>
        <div className="row">
          <div className="alert alert-info">

            <li>Desktop - <b>Largura: 1906px x Altura: 653px </b> <i>(Tamanho recomendado)</i></li>
            <li>Celular - <b>Largura: 900px x Altura: 1500px </b> <i>(Tamanho recomendado)</i></li>
            <li>Clique e arraste o banner para definir a ordem de prioridade</li>

          </div>
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className="col-md-4"
              draggable
              onDragStart={(e) => handleDragStart(e, banner)}
              onDrop={(e) => handleDrop(e, banner)}
              onDragOver={(e) => handleDragOver(e)}
            >
              <div className="card mb-3 position-relative">
                <img src={banner?.image} className="img-fluid rounded-start" alt="Slide" />
                <div className="overlay-icons">
                  {/* Ícones com cores baseadas no valor booleano */}
                  <span className={`badge ${banner?.mobile ? 'bg-primary' : 'bg-secondary'} me-2 p-2`}><DeviceTabletIcon className="icon-hero" /></span>
                  {/* <span className={`badge ${banner?.tablet ? 'bg-primary' : 'bg-secondary'} me-2`}><i className="bi bi-tablet"></i></span> */}
                  <span className={`badge ${banner?.pc ? 'bg-primary' : 'bg-secondary'} p-2`}><ComputerDesktopIcon className="icon-hero" /></span>
                </div>
                <div className="overlay-buttons" style={{ display: 'flex' }}>
                  {/* Botões */}
                  <Button
                    size="medium"
                    variant="primary"
                    className="me-2"
                    onClick={() => handleEdit(banner)}
                  >
                    <PencilSquareIcon className="icon-hero" />
                  </Button>


                  <Modal>
                    <Modal.Trigger>
                      <Button
                        size="medium"
                        variant="secondary"

                      >
                        <TrashIcon className="icon-hero" />
                      </Button>
                    </Modal.Trigger>
                    <Modal.Content>
                      <Box className="modal-responsivo" __backgroundColor="#fff" __height={'200px'} __padding={10} __boxShadow="defaultModal" __left="50%" __top="50%" position="fixed" __transform="translate(-50%, -50%)">

                        <div className="modal-content">
                          <div className="modal-header slide-banner-header">
                            <h5 className="modal-title">Excluir banner</h5>
                            <Modal.Close>
                              <Button
                                icon={<CloseIcon />}
                                size="small"
                                variant="tertiary"
                              />
                            </Modal.Close>
                          </div>
                          <hr />
                          <div className="modal-body p-2">
                            <p>Tem certeza de que deseja excluir este banner?</p>

                            <div className="modal-footer mt-2">
                              {/* <button type="button" className="btn btn-secondary" onClick={onRequestClose}>Fechar</button> */}
                              <Modal.Close>
                                <Button
                                  className="mx-2"
                                  size="large"
                                  variant="secondary"
                                >
                                  Cancelar
                                </Button>
                              </Modal.Close>

                              <Button size="large" onClick={() => handleDelete(banner)}>Sim</Button>
                            </div>
                          </div>
                        </div>
                      </Box>
                    </Modal.Content>
                  </Modal>

                  {/* <button className="btn btn-warning me-2" onClick={() => handleEdit(banner)}><PencilSquareIcon className="icon-hero" style={{ color: '#000' }} /></button> */}
                  {/* <button className="btn btn-danger" onClick={() => handleDelete(banner)}><TrashIcon className="icon-hero" /></button> */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Box >
  );
};

export default IndexPage;
